import Logger from 'bunyan';
import { inject, injectable } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import _ from 'lodash';
import { fromPartialRecord } from '../../database/Patch';
import { DependencyFactoryFactory, DeviceAlarmSettings, EntityAlarmSettingsItem, PropExpand, UpdateAlarmSettings, User, UnitSystem, UserCreate, RetrieveAlarmSettingsFilter, EntityAlarmSettings } from '../api';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import { NotificationService, NotificationServiceFactory } from '../notification/NotificationService';
import { AccountResolver, LocationResolver, PropertyResolverMap, Resolver } from '../resolver';
import { UserAccountRoleRecord } from './UserAccountRoleRecord';
import UserAccountRoleTable from './UserAccountRoleTable';
import { UserDetailRecord } from './UserDetailRecord';
import UserDetailTable from './UserDetailTable';
import { UserLocationRoleRecord, UserLocationRoleRecordData } from './UserLocationRoleRecord';
import UserLocationRoleTable from './UserLocationRoleTable';
import { UserRecord, UserRecordData } from './UserRecord';
import UserTable from './UserTable';
import LocationTreeTable from '../location/LocationTreeTable';
import uuid from 'uuid';

@injectable()
class UserResolver extends Resolver<User> {
  protected propertyResolverMap: PropertyResolverMap<User> = {
    locations: async (model: User, shouldExpand: boolean = false, expandProps?: PropExpand) => {
      const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(model.id);

      if (userAccountRoleRecordData == null) {
        return null;
      }

      const locations = await this.locationResolverFactory().getByUserIdWithChildren(model.id, shouldExpand ? expandProps : undefined);
      
      if (!shouldExpand) {
        return locations.map(({ id }) => ({ id }));
      }

      return locations;
    },
    account: async (model: User, shouldExpand = false) => {
      const userAccountRoleRecordData = await this.userAccountRoleTable.getByUserId(model.id);
      if (userAccountRoleRecordData === null) {
        return null;
      }

      if (!shouldExpand) {
        return {
          id: userAccountRoleRecordData.account_id
        };
      }

      return this.accountResolverFactory().getAccount(userAccountRoleRecordData.account_id);
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
      if (!shouldExpand || !this.notificationServiceFactory) {
        return null;
      }

      try {
        // const userLocationRoleRecordData: UserLocationRoleRecordData[] = await this.userLocationRoleTable.getAllByUserId(model.id);
        // const locationResolver = this.locationResolverFactory();
        // const devices = _.flatten(await Promise.all(
        //     userLocationRoleRecordData
        //         .map(async ({ location_id }) => {
        //           const location = await locationResolver.get(location_id, {
        //             $select: {
        //               devices: {
        //                 $select: {
        //                   id: true
        //                 }
        //               }
        //             }
        //           });
        //           return location ? location.devices: [];
        //         })
        // ));

        const locations = await this.locationResolverFactory().getByUserIdWithChildren(model.id, {
          $select: {
            devices: {
              $select: {
                id: true
              }
            }
          }
        });
        const devices = _.flatten(locations.map(location => location.devices || []));

        if (_.isEmpty(devices)) {
          return null;
        }

        const isDeviceSettings = (s: EntityAlarmSettingsItem): s is DeviceAlarmSettings => {
          return (s as DeviceAlarmSettings).deviceId !== undefined;
        }
        const settings = (await this.notificationServiceFactory().getAlarmSettingsInBulk(model.id, { deviceIds: devices.map(device => device.id) }));
        return settings.items.filter(isDeviceSettings);
        
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
  private notificationServiceFactory: () => NotificationService;

  constructor(
    @inject('UserTable') private userTable: UserTable,
    @inject('UserDetailTable') private userDetailTable: UserDetailTable,
    @inject('UserLocationRoleTable') private userLocationRoleTable: UserLocationRoleTable,
    @inject('UserAccountRoleTable') private userAccountRoleTable: UserAccountRoleTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('DefaultUserLocale') private defaultUserLocale: string,
    @inject('NotificationServiceFactory') notificationServiceFactory: NotificationServiceFactory,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext,
    @inject('Logger') private readonly logger: Logger,
    @inject('LocationTreeTable') private locationTreeTable: LocationTreeTable,
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');
    this.accountResolverFactory = depFactoryFactory<AccountResolver>('AccountResolver');

    if (!_.isEmpty(this.httpContext)) {
      this.notificationServiceFactory = () => notificationServiceFactory.create(this.httpContext.request);
    }
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
    return this.notificationServiceFactory().updateAlarmSettings(id, settings);
  }

  public async retrieveAlarmSettings(id: string, filter: RetrieveAlarmSettingsFilter): Promise<EntityAlarmSettings> {
    return this.notificationServiceFactory().getAlarmSettingsInBulk(id, filter);
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
        email: userCreate.email,
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
}

export { UserResolver };
