import { IFTTTService, UserService, AlertService } from '../core/service';
import { inject, injectable } from 'inversify';
import _ from 'lodash';
import { TestSetupResponse, UserInfoResponse, AlertTriggerResponse } from '../core/ifttt/response/IFTTTResponse';
import { TriggerData, TriggerId } from '../core/ifttt/model/Trigger';
import { isNone } from 'fp-ts/lib/Option';
import NotFoundError from '../core/api/error/NotFoundError';
import { ResidenceType, AlarmSeverity, PaginatedResult, AlarmEvent } from '../core/api';
import moment from 'moment';
import TriggerIdentityLogTable from '../core/ifttt/TriggerIdentityLogTable';

@injectable()
class DefaultIFTTTService implements IFTTTService {

  constructor(
    @inject('UserService') private userService: UserService,
    @inject('AlertService') private alertService: AlertService,
    @inject('TriggerIdentityLogTable') private triggerIdentityTable: TriggerIdentityLogTable,
  ) {
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

  public async getTestSetup(iftttServiceKey: string): Promise<TestSetupResponse> {
    throw new Error("Method not implemented.");
  }

  public async getEventsBySeverityTrigger(userId: string, severity: AlarmSeverity, floTriggerId: TriggerId, triggerData: TriggerData): Promise<AlertTriggerResponse> {
    // If they send limit 0, doing triggerData.limit || 50 will return 50
    const limit = (triggerData.limit || triggerData.limit === 0) ? triggerData.limit : 50;
    const alertIds = triggerData.triggerFields.alert_ids;
    const alertsFilter = alertIds && alertIds.split(',').filter(alarmId => alarmId).map(alarmId => parseInt(alarmId.trim(), 10));

    const userData = await this.userService.getUserById(userId, ['locations']);
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

  public async openValveAction(userId: string): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async closeValveAction(userId: string): Promise<any> {
    throw new Error("Method not implemented.");
  }

  public async changeSystemModeAction(userId: string, userAction: any): Promise<any> {
    throw new Error("Method not implemented.");
  }

  private async getEventsByFilter(locationId: string, severity: AlarmSeverity, alertsFilter: number[]): Promise<AlarmEvent[]> {
    const filters = { isInternalAlarm: false, locationId, status: 'triggered', severity, page: 1, size: 100 };
    const query = _.map(filters, (val: any, key: string) => `${key}=${val}`).join('&');
    const result: PaginatedResult<AlarmEvent> = await this.alertService.getAlarmEventsByFilter(query);
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
