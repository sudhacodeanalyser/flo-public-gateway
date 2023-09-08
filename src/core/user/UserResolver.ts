import Logger from 'bunyan';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { fromPartialRecord } from '../../database/Patch';
import { DependencyFactoryFactory, DeviceAlarmSettings, EntityAlarmSettingsItem, PropExpand, UpdateAlarmSettings, User, UnitSystem, UserCreate, RetrieveAlarmSettingsFilter, EntityAlarmSettings,
LocationAlarmSettings, AlarmSettings, AccountType, AdminUserCreate } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { NotificationService } from '../notification/NotificationService';
import { AccountResolver, DeviceResolver, LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import { UserAccountRoleRecord } from './UserAccountRoleRecord';
import UserAccountRoleTable from './UserAccountRoleTable';
import { UserDetailRecord } from './UserDetailRecord';
import UserDetailTable from './UserDetailTable';
import { UserLocationRoleRecord, UserLocationRoleRecordData } from './UserLocationRoleRecord';
import UserLocationRoleTable from './UserLocationRoleTable';
import { UserRecord, UserRecordData } from './UserRecord';
import UserTable from './UserTable';
import LocationTreeTable, { LocationTreeRow } from '../location/LocationTreeTable';
import * as uuid from 'uuid';
import { AccountRecord, AccountRecordData } from '../account/AccountRecord';
import AccountTable from '../account/AccountTable';
import UserSystemRoleTable from './UserSystemRoleTable';

@injectable()
class UserResolver extends Resolver<User> {
  protected propertyResolverMap: PropertyResolverMap<User> = {
    locations: async (model: User, shouldExpand: boolean = false, expandProps?: PropExpand) => {
      const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(model.id);

      if (userAccountRoleRecordData == null) {
        return null;
      }
      const accountRecordData: AccountRecordData | null = await this.accountTable.get({ id: userAccountRoleRecordData.account_id });
      if (accountRecordData == null) {
        return null;
      }
      const account = new AccountRecord(accountRecordData).toModel();
      if (account.type === AccountType.ENTERPRISE && !shouldExpand) {
        return null;
      }

      const userLocationRoleRecordData: UserLocationRoleRecordData[] = await this.userLocationRoleTable.getAllByUserId(model.id);
      const rootLocationIds = userLocationRoleRecordData.map(({ location_id }) => location_id);
      const subTrees = _.flatten(await Promise.all(
        rootLocationIds.map(parentId => this.locationTreeTable.getAllChildren(userAccountRoleRecordData.account_id, parentId))
      ));
      const locationIds = _.uniq([
        ...rootLocationIds,
        ...subTrees.map(({ child_id }) => child_id)
      ]);
      
      if (!shouldExpand) {
        return locationIds.map(id => ({ id }));
      }

      return Promise.all(locationIds.map(
        async (locationId) => {
          const location = await this.locationResolverFactory().get(locationId, expandProps);

          return {
            ...location,
            id: locationId
          };
        }
      ));

      // const locations = await this.locationResolverFactory().getByUserIdWithChildren(model.id, shouldExpand ? expandProps : undefined);
      
      // if (!shouldExpand) {
      //   return locations.items.map(({ id }) => ({ id }));
      // }

      // return locations.items;
    },
    account: async (model: User, shouldExpand = false, expandProps?: PropExpand) => {
      const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(model.id);
      if (userAccountRoleRecordData === null) {
        return null;
      }

      if (!shouldExpand) {
        return {
          id: userAccountRoleRecordData.account_id
        };
      }

      return this.accountResolverFactory().getAccount(userAccountRoleRecordData.account_id, expandProps);
    },
    accountRole: async (model: User, shouldExpand = false) => {
      const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(model.id);

      return userAccountRoleRecordData === null ?
        null :
        new UserAccountRoleRecord(userAccountRoleRecordData).toUserAccountRole();
    },
    locationRoles: async (model: User, shouldExpand = false) => {
      const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(model.id);

      if (userAccountRoleRecordData === null) {
        return null;
      }
      const accountRecordData = await this.accountTable.get({ id: userAccountRoleRecordData.account_id });
      if (accountRecordData == null) {
        return null;
      }
      const account = new AccountRecord(accountRecordData).toModel();
      if (account.type === AccountType.ENTERPRISE && !shouldExpand) {
        return null;
      }

      const userLocationRoleRecordData: UserLocationRoleRecordData[] = await this.userLocationRoleTable.getAllByUserId(model.id);
      const explicitRoles = userLocationRoleRecordData.map(userLocationRoleRecordDatum =>
        new UserLocationRoleRecord(userLocationRoleRecordDatum).toUserLocationRole()
      );
      const locationIds = explicitRoles.map(({ locationId }) => locationId);
      const subTrees = await this.locationTreeTable.batchGetAllChildren(userAccountRoleRecordData.account_id, locationIds);
      const childRoles = _.chain(explicitRoles)
        .flatMap(({ locationId, roles }) => {
          return _.chain(subTrees)
            .filter({ parent_id: locationId })
            .map(({ child_id }) => ({
              locationId: child_id,
              roles: [] as string[],
              inherited: [{
                roles,
                locationId
              }]
            }))
            .value();
        })
        .value();

      return _.chain([...explicitRoles, ...childRoles])
        .groupBy('locationId')
        .map((locationRoles, locationId) => 
          locationRoles.reduce((acc, { roles, inherited }) => ({
            locationId,
            roles: [...roles, ...acc.roles],
            inherited: !inherited && !acc.inherited ? 
              undefined :
              [...(inherited || []), ...(acc.inherited || [])]
          }))
        )
        .value();
    },
    alarmSettings: async (model: User, shouldExpand = false) => {
      if (!shouldExpand) {
        return null;
      }

      try {
        const userLocationRoleRecordData: UserLocationRoleRecordData[] = await this.userLocationRoleTable.getAllByUserId(model.id);
        const locationResolver = this.locationResolverFactory();
        const devices = _.flatten(await Promise.all(
            userLocationRoleRecordData
                .map(async ({ location_id }) => {
                  const location = await locationResolver.get(location_id, {
                    $select: {
                      devices: {
                        $select: {
                          id: true
                        }
                      }
                    }
                  });
                  return location ? location.devices: [];
                })
        ));

        // const locations = await this.locationResolverFactory().getByUserIdWithChildren(model.id, {
        //   $select: {
        //     devices: {
        //       $select: {
        //         id: true
        //       }
        //     }
        //   }
        // });
        // const devices = _.flatten(locations.items.map(location => location.devices || []));

        if (_.isEmpty(devices)) {
          return null;
        }

        const settings = (await this.retrieveAlarmSettings(model.id, { deviceIds: devices.map(device => device.id) }));
        return settings.items
          .filter(this.isDeviceSetting)
          .map(({ userDefined, ...rest }) => rest);
      } catch (err) {
        this.logger.error({ err });

        return null;
      }
    },
    unitSystem: async (model: User, shouldExpand = false) => {
      return model.unitSystem || UnitSystem.IMPERIAL_US;
    }
  };

  private locationResolverFactory: () => LocationResolver;
  private accountResolverFactory: () => AccountResolver;
  private deviceResolverFactory: () => DeviceResolver;

  constructor(
    @inject('UserTable') private userTable: UserTable,
    @inject('UserDetailTable') private userDetailTable: UserDetailTable,
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable,
    @inject('UserAccountRoleTable') private userAccountRoleTable: UserAccountRoleTable,
    @inject('UserSystemRoleTable') private userSystemRoleTable: UserSystemRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('DefaultUserLocale') private defaultUserLocale: string,
    @inject('NotificationService') private notificationService: NotificationService,
    @inject('Logger') private readonly logger: Logger,
    @inject('LocationTreeTable') private locationTreeTable: LocationTreeTable,
    @inject('AccountTable') private accountTable: AccountTable,
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');
    this.accountResolverFactory = depFactoryFactory<AccountResolver>('AccountResolver');
    this.deviceResolverFactory = depFactoryFactory<DeviceResolver>('DeviceResolver');
  }

  public async updatePartialUser(id: string, partialUser: Partial<User>): Promise<User> {
    const userRecord = UserRecord.fromModel(partialUser);
    const userDetailRecord = UserDetailRecord.fromModel(partialUser);
    const userPatch = _.isEmpty(userRecord) ? undefined : fromPartialRecord(userRecord);
    const userDetailPatch = _.isEmpty(userDetailRecord) ? undefined : fromPartialRecord(userDetailRecord);

    const updatedUserRecord = await (
      userPatch ?
        this.userTable.update({ id }, userPatch) :
        this.userTable.get({ id })
    );
    const updatedUserDetailRecord = updatedUserRecord && (await (
      userDetailPatch ? 
        this.userDetailTable.update({ user_id: id }, userDetailPatch) :
        this.userDetailTable.get({ user_id: id })
    ));

    if (updatedUserRecord === null || updatedUserDetailRecord === null) {
      // This should not happen, unless a user is deleted between the update and retrieval.
      throw new ResourceDoesNotExistError();
    }

    return new UserRecord({ ...updatedUserRecord, ...updatedUserDetailRecord }).toModel();
  }

  public async isSuperUser(id: string): Promise<boolean> {
    const user = await this.userTable.get({ id });
    return user?.is_super_user === true;
  }

  public async getUserById(id: string, expandProps?: PropExpand): Promise<User | null> {
    const [userRecord, userDetailRecord] = await Promise.all([
      this.userTable.get({ id }),
      this.userDetailTable.get({ user_id: id })
    ]);

    if (userRecord === null || userDetailRecord === null) {
      return null;
    }

    const user = new UserRecord({
      ...userRecord,
      ...userDetailRecord,
      locale: userDetailRecord.locale || this.defaultUserLocale
    }).toModel();

    const expandedProps = await this.resolveProps(user, expandProps);

    return {
      ...user,
      ...expandedProps
    };
  }

  public async removeUser(id: string): Promise<void> {
    const userLocationRoleRecordData: UserLocationRoleRecordData[] = await this.userLocationRoleTable.getAllByUserId(id);
    const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(id);

    // TODO: Make this transactional.
    // https://aws.amazon.com/blogs/aws/new-amazon-dynamodb-transactions/
    await Promise.all([
      ...userLocationRoleRecordData.map(datum =>
        this.userLocationRoleTable.remove({ user_id: id, location_id: datum.location_id }
      )),

      Promise.resolve<false | void>(userAccountRoleRecordData !== null &&
        this.userAccountRoleTable.remove({ user_id: id, account_id: userAccountRoleRecordData.account_id })
      ),

      this.userDetailTable.remove({ user_id: id }),
      this.userTable.remove({ id })
    ]);
  }

  public async updateAlarmSettings(id: string, settings: UpdateAlarmSettings): Promise<void> {
    const accountType = await this.getAccountType(id);
    return this.notificationService.updateAlarmSettings(id, {
      ...settings,
      accountType
    });
  }

  public async retrieveAlarmSettings(id: string, filter: RetrieveAlarmSettingsFilter): Promise<EntityAlarmSettings> {
    const accountType = await this.getAccountType(id);

    const isLocationFilter = (f: RetrieveAlarmSettingsFilter): f is { locationIds: string[] } => {
      return !_.isEmpty((f as any).locationIds);
    };    

    const hierarchyToSet = (h: Record<string, string | undefined>) => 
      new Set(_.chain(h)
        .entries()
        .flatMap(([k, v]) => v ? [k, v] : [k])
        .value());

    if (isLocationFilter(filter)) { 
      const locationHierarchyMap: Record<string, string | undefined> = await filter.locationIds.reduce(
        async (eventualObj: Promise<Record<string, string>>, locationId: string) => {
          const locationHierarchyMapping = await this.getLocationHierarchy(locationId);
          const obj = await eventualObj;
          return {
            ...obj,
            ...locationHierarchyMapping
          };
        }, Promise.resolve({})
      );

      const locationIdSet = hierarchyToSet(locationHierarchyMap);
      const alarmSettings = await this.notificationService.getAlarmSettings(id, { 
        locationIds: Array.from(locationIdSet),
        accountType
      });
      const settingsByLocation: Record<string, LocationAlarmSettings> = alarmSettings.items.reduce((obj, item) => ({
        ...obj,
        ...(this.isLocationSetting(item) && { [item.locationId]: item })
      }), {});

      return { 
        items: filter.locationIds.map(locationId => this.buildLocationSettings(locationId, settingsByLocation, locationHierarchyMap))
      };

    }

    const deviceSettings = await this.notificationService.getAlarmSettings(id, {
      ...filter,
      accountType
    });
    const locationMapping: Record<string, any> = await filter.deviceIds.reduce(
      async (eventualObj: Promise<Record<string, any>>, deviceId: string) => {
        const device = await this.deviceResolverFactory().get(deviceId, { $select: { location: { $select: { id: true, account: { $select: { id: true } } } } } });
        const locationHierarchyMapping = await this.getLocationHierarchy(device?.location?.id);
        const obj = await eventualObj;
        return {
          locationByDevice: {
            ...obj.locationByDevice,
            [deviceId]: device?.location?.id,
          },
          
          locationHierarchy: {
            ...obj.locationHierarchy,
            ...locationHierarchyMapping
          }
        };
      }, Promise.resolve({})
    );

    const locationIdSet = hierarchyToSet(locationMapping.locationHierarchy);
    const locationSettings = await this.notificationService.getAlarmSettings(id, { 
      locationIds: Array.from(locationIdSet),
      accountType
    });
    const settingsById = _.chain(deviceSettings.items)
      .concat(locationSettings.items)
      .reduce((obj, item) => ({
        ...obj,
        ...(this.isLocationSetting(item) && { [item.locationId]: item }),
        ...(this.isDeviceSetting(item) && { [item.deviceId]: item })
      }), {})
      .value();

    const hierarchyMap = {
      ...locationMapping.locationHierarchy,
      ...locationMapping.locationByDevice
    }

    return { 
      items: filter.deviceIds.map(deviceId => this.buildDeviceSettings(deviceId, settingsById, hierarchyMap))
    };
  }

  public async setEnabledFeatures(id: string, features: string[]): Promise<void> {
    const userDetailRecord = UserDetailRecord.fromModel({
      enabledFeatures: features
    });
    const patch = fromPartialRecord(userDetailRecord);

    await this.userDetailTable.update({ user_id: id }, patch);
  }

  public async createUser(userCreate: UserCreate): Promise<User> {
    const id = uuid.v4();
    const [
      createdUserRecord,
      createdUserDetailRecord
    ] = await Promise.all([
      this.userTable.put({
        id,
        account_id: userCreate.account.id,
        email: userCreate.email.toLowerCase().trim(),
        password: userCreate.password,
        source: userCreate.source,
        is_active: true
      }), 
      this.userDetailTable.put({
        user_id: id,
        firstname: userCreate.firstName,
        lastname: userCreate.lastName,
        middlename: userCreate.middleName,
        prefixname: userCreate.prefixName,
        suffixname: userCreate.suffixName,
        phone_mobile: userCreate.phoneMobile,
        locale: userCreate.locale
      })
    ]);
    const user = new UserRecord({
      ...createdUserRecord,
      ...createdUserDetailRecord
    }).toModel();

    return user;
  }

  public async createAdminUser(adminUserCreate: AdminUserCreate): Promise<void> {
    const id = uuid.v4();
    await this.userTable.put({
      id,
      email: adminUserCreate.email,
      password: adminUserCreate.password,
      is_active: true,
      is_system_user: true,
      is_super_user: adminUserCreate.isSuperUser
    });
    await this.userSystemRoleTable.put({
      user_id: id,
      roles: [ 'admin' ]
    });
  }

  public async removeAdminUser(id: string): Promise<void> {
    await this.userSystemRoleTable.remove({ user_id: id });
    await this.userTable.remove({ id });
  }

  public async getByEmail(email: string, expandProps?: PropExpand): Promise<User | null> {
    const userRecord = await this.userTable.getByEmail(email);

    if (!userRecord) {
      return null;
    }

    const userDetailRecord = await this.userDetailTable.get({ user_id: userRecord.id });

    if (!userDetailRecord) {
      return null;
    }

    const user = new UserRecord({
      ...userRecord,
      ...userDetailRecord || {},
      locale: userDetailRecord.locale || this.defaultUserLocale
    }).toModel();
    const expandedProps = await this.resolveProps(user, expandProps);

    return {
      ...user,
      ...expandedProps
    };
  }

  private async getAccountType(userId: string): Promise<string> {
    const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(userId);
    return !userAccountRoleRecordData ? 
      'personal' :  
      (
        (await this.accountResolverFactory().getAccount(
          userAccountRoleRecordData.account_id, 
          { 
            $select: {
              id: true,
              type: true
            }
          }
        )
      )?.type) || 'personal';
  }
  
  private async getLocationHierarchy(locationId?: string): Promise<Record<string, string | undefined>> {
    if (!locationId) {
      return {};
    }
    const location = await this.locationResolverFactory().get(locationId, { $select: { account: { $select: { id: true } } } });
    const parents: LocationTreeRow[] = location ? 
      await this.locationTreeTable.getAllParents(location.account.id, locationId) :
      [];
    
    if (_.isEmpty(parents)) {
      return {
        [locationId]: undefined
      };
    }
    
    const { mapping } = _.chain(parents)
      .sortBy('depth')
      .reduce(
        ({ mapping: currentMapping, currentChildId }, { parent_id, child_id }) => ({
          currentChildId: parent_id,
          mapping: {
            ...currentMapping,
            [currentChildId || child_id]: parent_id
          }
        }),
        { mapping: {}, currentChildId: '' }
      )
      .value();

    return mapping;
  }

  private buildLocationSettings(locationId: string, settingsByLocation: Record<string, LocationAlarmSettings>, locationHierarchyMap: Record<string, string | undefined>): LocationAlarmSettings {
    return {
      locationId,
      settings: this.buildSettings(locationId, settingsByLocation, locationHierarchyMap),
      userDefined: undefined
    };
  }

  private buildDeviceSettings(deviceId: string, settingsById: Record<string, EntityAlarmSettingsItem>, hierarchyMap: Record<string, string | undefined>): DeviceAlarmSettings {
    const deviceSettings = settingsById[deviceId] || {};
    return {
      deviceId,
      smallDripSensitivity: undefined,
      floSenseLevel: undefined,
      ...(this.isDeviceSetting(deviceSettings) && {
        smallDripSensitivity: deviceSettings.smallDripSensitivity,
        floSenseLevel: deviceSettings.floSenseLevel
      }),
      settings: this.buildSettings(deviceId, settingsById, hierarchyMap),
      userDefined: undefined
    };
  }

  private buildSettings(entityId: string, settingsById: Record<string, EntityAlarmSettingsItem>, hierarchyMap: Record<string, string | undefined>): AlarmSettings[] {
    const baseLocationIdSettings: EntityAlarmSettingsItem = settingsById[entityId] || {};
    const parentLocationId = hierarchyMap[entityId];
    const settingsMap: Record<string, AlarmSettings[]> = _.merge({},
      !baseLocationIdSettings.settings ? 
        {} : 
        _.groupBy(
          baseLocationIdSettings.settings, 
          this.buildAlarmSettingsKey
        ),
      !parentLocationId ? 
        {} : 
        _.groupBy(
          this.buildSettings(parentLocationId, settingsById, hierarchyMap), 
          this.buildAlarmSettingsKey
        ),
      !baseLocationIdSettings.userDefined ? 
        {} : 
        _.groupBy(
          baseLocationIdSettings.userDefined, 
          this.buildAlarmSettingsKey
        )
    );
    return _.chain(settingsMap)
      .keys()
      .reduce((arr, k) => _.concat(arr, settingsMap[k]), [] as AlarmSettings[])
      .value();
  }

  private buildAlarmSettingsKey(s: AlarmSettings): string { 
    return `${s.alarmId}-${s.systemMode}`;
  }

  private isLocationSetting = (s: EntityAlarmSettingsItem): s is LocationAlarmSettings => {
    return !_.isNil((s as any).locationId);
  };

  private isDeviceSetting = (s: EntityAlarmSettingsItem): s is DeviceAlarmSettings => {
    return !_.isNil((s as any).deviceId);
  };
}

export { UserResolver };
