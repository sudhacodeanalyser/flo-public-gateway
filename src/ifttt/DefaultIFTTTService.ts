import { IFTTTService, UserService, AlertService, DeviceService, LocationService } from '../core/service';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import * as uuid from 'uuid';
import { TestSetupResponse, UserInfoResponse, AlertTriggerResponse, ActionResponse } from '../core/ifttt/response/IFTTTResponse';
import { TriggerData, TriggerId } from '../core/ifttt/model/Trigger';
import { isNone } from 'fp-ts/lib/Option';
import NotFoundError from '../core/api/error/NotFoundError';
import { ResidenceType, AlarmSeverity, PaginatedResult, AlarmEvent, SystemMode, Location } from '../core/api';
import moment from 'moment';
import TriggerIdentityLogTable from '../core/ifttt/TriggerIdentityLogTable';
import { DirectiveService } from '../core/device/DirectiveService';
import { ActionData } from '../core/ifttt/model/Action';
import { DeviceSystemModeService } from '../core/device/DeviceSystemModeService';
import ActionFieldsError from '../core/ifttt/error/ActionFieldsError';
import TriggerFieldsError from '../core/ifttt/error/TriggerFieldsError';
import { HttpService } from '../http/HttpService';
import { $enum } from 'ts-enum-util';

@injectable()
class DefaultIFTTTService extends HttpService implements IFTTTService {

  constructor(
    @inject('UserService') private readonly userService: UserService,
    @inject('AlertService') private readonly alertService: AlertService,
    @inject('TriggerIdentityLogTable') private readonly triggerIdentityTable: TriggerIdentityLogTable,
    @inject('DeviceService') private readonly deviceService: DeviceService,
    @inject('IFTTTServiceKey') private readonly iftttServiceKey: string,
    @inject('IftttRealtimeNotificationsUrl') private readonly iftttRealtimeNotificationsUrl: string,
    @inject('LocationService') private readonly locationService: LocationService,
  ) {
    super();
  }

  public async getStatus(): Promise<void> {
    return Promise.resolve();
  }

  public async getUserInfo(userId: string): Promise<UserInfoResponse> {
    const userData = await this.userService.getUserById(userId);
    if (isNone(userData)) {
      throw new NotFoundError('User not found.');
    }

    return {
      data: {
        id: userData.value.id,
        name: `${userData.value.firstName} ${userData.value.lastName}`
      }
    }
  }

  public async getTestSetup(): Promise<TestSetupResponse> {
    throw new Error("Method not implemented.");
  }

  public async getEventsBySeverityTrigger(userId: string, severity: AlarmSeverity, floTriggerId: TriggerId, triggerData: TriggerData): Promise<AlertTriggerResponse> {
    // If they send limit 0, doing triggerData.limit || 50 will return 50
    const limit = (triggerData.limit || triggerData.limit === 0) ? triggerData.limit : 50;
    if (!triggerData.triggerFields || !triggerData.triggerFields.alert_ids) {
      throw new TriggerFieldsError();
    }
    const alertIds = triggerData.triggerFields.alert_ids;
    const alertsFilter = alertIds && alertIds.split(',').filter(alarmId => alarmId).map(alarmId => parseInt(alarmId.trim(), 10));

    const userData = await this.userService.getUserById(userId, {
      $select: {
        locations: {
          $expand: true
        }
      }
    });
    if (isNone(userData)) {
      throw new NotFoundError('User not found.');
    }
    await this.logTriggerIdentity(userId, floTriggerId, triggerData);

    const location = userData.value.locations.find(loc => loc.residenceType === ResidenceType.PRIMARY) || userData.value.locations[0];
    const addressLine = location.address;
    const fullAddress = `${addressLine}, ${location.city}, ${location.state} ${location.postalCode}`;
    
    const events = await this.getEventsByFilter(location.id, severity, alertsFilter || []);

    const lastAlerts = _.orderBy(events, ['updateAt'], ['desc']).slice(0, limit);
    const result = lastAlerts.map((event: any) => ({
      alert_id: event.alarm.id.toString(),
      alert_name: event.displayTitle,
      system_mode: `${_.capitalize(event.systemMode)} Mode`,
      full_address: fullAddress,
      created_at: event.updateAt,
      meta: {
        id: event.id,
        timestamp: moment(event.updateAt).unix()
      }
    }));
    return { data: result };
  }

  public async openValveAction(userId: string, directiveService: DirectiveService): Promise<ActionResponse> {
    const deviceId = await this.getDefaultDeviceId(userId);
    await directiveService.openValve(deviceId);
    return {
      data: [{
        id: new Date().getTime()
      }]
    };
  }

  public async closeValveAction(userId: string, directiveService: DirectiveService): Promise<ActionResponse> {
    const deviceId = await this.getDefaultDeviceId(userId);
    await directiveService.closeValve(deviceId);
    return {
      data: [{
        id: new Date().getTime()
      }]
    };
  }

  public async changeSystemModeAction(userId: string, userAction: ActionData, systemModeService: DeviceSystemModeService): Promise<ActionResponse> {
    const location = await this.getDefaultLocation(userId);
    if (!userAction.actionFields || !userAction.actionFields.device_mode) {
      throw new ActionFieldsError('Missing system mode field');
    }
    try {
      const systemMode = $enum(SystemMode).asValueOrThrow(userAction.actionFields.device_mode);
      await this.locationService.setSystemMode(location.id, systemModeService, { target: systemMode });

      return {
        data: [{
          id: new Date().getTime()
        }]
      };
    } catch (error: any) {
      if (error.message.includes('Unexpected value')) {
        throw new ActionFieldsError(error.message);
      } else {
        throw error;
      }
    }
  }

  public async notifyRealtimeAlert(deviceId: string, triggerId: TriggerId): Promise<void> {
    const device = await this.deviceService.getDeviceById(deviceId, {
      $select: {
        location: {
          $select: {
            users: true
          }
        }
      }
    });
    if (isNone(device)) {
      throw new NotFoundError('Device not found.');
    }
    if (!device.value.location.users) {
      throw new NotFoundError('Device has no associated users.');
    }
    const users = device.value.location.users;
    const queryPromises = users.map(user => this.triggerIdentityTable.getByUserIdAndTriggerId(user.id, triggerId.valueOf()));
    const userTriggerIdentities = await Promise.all(queryPromises);
    const triggerIdentities = _.chain(userTriggerIdentities)
      .flatten()
      .map(({ trigger_identity }) => ({
        trigger_identity
      }))
      .value();

    if (!triggerIdentities.length) {
      return;
    }

    const request = {
      method: 'POST',
      url: this.iftttRealtimeNotificationsUrl,
      customHeaders: {
        'IFTTT-Service-Key': this.iftttServiceKey,
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'X-Request-ID': uuid.v4()
      },
      body: {
        data: triggerIdentities
      }
    };
    await this.sendRequest(request);
  }

  public async deleteTriggerIdentity(userId: string, triggerIdentity: string): Promise<void> {
    return this.triggerIdentityTable.remove({ user_id: userId, trigger_identity: triggerIdentity });
  }

  private async getDefaultLocation(userId: string, withDevices: boolean = false): Promise<Location> {
    // TODO: Implement multi entity targeting the action to the correspoinding device.
    const userData = await this.userService.getUserById(userId, {
      $select: {
        locations: {
          $select: {
            id: true,
            residenceType: true,
            ...(withDevices && {
              devices: {
                $select: {
                  id: true
                }
              }
            })
          }
        }
      }
    });

    if (isNone(userData)) {
      throw new NotFoundError('User not found.');
    }
    if (_.isEmpty(userData.value.locations)) {
      throw new NotFoundError('User has no locations');
    }
    const location = userData.value.locations.find(loc => loc.residenceType === ResidenceType.PRIMARY) || userData.value.locations[0];
    return location as Location;
  }

  private async getDefaultDeviceId(userId: string): Promise<string> {
    const location = await this.getDefaultLocation(userId, true);
    if (!location.devices || _.isEmpty(location.devices)) {
      throw new NotFoundError('User has no devices');
    }
    return location.devices[0].id;
  }

  private async getEventsByFilter(locationId: string, severity: AlarmSeverity, alertsFilter: number[]): Promise<AlarmEvent[]> {
    const filters = { 
      isInternalAlarm: false, 
      locationId: [locationId], 
      severity: [severity], 
      page: 1, 
      size: 100 
    };
    const result: PaginatedResult<AlarmEvent> = await this.alertService.getAlarmEventsByFilter(filters);
    // TODO: At this time getAlarmEventsByFilter does not provide a way to filter by alarm id.
    return result.items.filter(event => alertsFilter.includes(event.alarm.id));
  }

  private async logTriggerIdentity(userId: string, floTriggerId: TriggerId, triggerData: TriggerData): Promise<void> {
    const data = {
      trigger_identity: triggerData.trigger_identity,
      user_id: userId,
      flo_trigger_id: floTriggerId,
      trigger_slug: triggerData.trigger_slug,
      ifttt_source: triggerData.ifttt_source,
      flo_trigger_id_trigger_identity: `${floTriggerId}_${triggerData.trigger_identity}`
    };
    await this.triggerIdentityTable.put(data);
  }
}

export { DefaultIFTTTService }
