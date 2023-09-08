import { IFTTTService } from '../core/service';
import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import * as uuid from 'uuid';
import { HttpService } from '../http/HttpService';
import { TestSetupResponse, UserInfoResponse, AlertTriggerResponse, ActionResponse } from '../core/ifttt/response/IFTTTResponse';
import { UserInfo } from '../core/ifttt/model/UserInfo';
import { TriggerData, TriggerId } from '../core/ifttt/model/Trigger';
import { SystemMode, AlarmSeverity } from '../core/api';
import { DirectiveService } from '../core/device/DirectiveService';
import { ActionData } from '../core/ifttt/model/Action';
import { DeviceSystemModeService } from '../core/device/DeviceSystemModeService';
import TriggerFieldsError from '../core/ifttt/error/TriggerFieldsError';
import ActionFieldsError from '../core/ifttt/error/ActionFieldsError';

@injectable()
class DefaultIFTTTTestService extends HttpService implements IFTTTService {

  private user: UserInfo;

  constructor(
      @inject('ApiV1IFTTTTestSetupUrl') private readonly apiV1IFTTTTestSetupUrl: string,
      @inject('IFTTTServiceKey') private readonly iftttServiceKey: string,
    ) {
    super();
    this.user = {
      id: uuid.v4(),
      name: 'Test user'
    };
  }

  public async getStatus(): Promise<any> {
    return {};
  }

  public async deleteTriggerIdentity(userId: string, triggerIdentity: string): Promise<void> {
    return Promise.resolve();
  }

  public async getUserInfo(userId: string): Promise<UserInfoResponse> {
    return {
      data: this.user
    };
  }

  public async getTestSetup(): Promise<TestSetupResponse> {
    const request = {
      method: 'POST',
      url: this.apiV1IFTTTTestSetupUrl,
      customHeaders: {
        "IFTTT-Service-Key": this.iftttServiceKey
      },
    };
    const response: TestSetupResponse = await this.sendRequest(request);
    return {
      data: {
        accessToken: response.data.accessToken,
        samples: {
          triggers: {
            critical_alert_detected: {
              alert_ids: '10,11,26,52,53'
            },
            warning_alert_detected: {
              alert_ids: '13,14,15,16,18,22,23,28,29,30,31,33'
            },
            info_alert_detected: {
              alert_ids: '5,34,32,39,40,41,45,50'
            }
          },
          actions: {
            turn_water_on: {},
            turn_water_off: {},
            change_device_mode: {
              device_mode: '2'
            }
          }
        }
      }
    }
  }

  public async getEventsBySeverityTrigger(userId: string, severity: AlarmSeverity, floTriggerId: TriggerId, triggerData: TriggerData): Promise<AlertTriggerResponse> {
    // If they send limit 0, doing triggerData.limit || 50 will return 50
    const limit = (triggerData.limit || triggerData.limit === 0) ? triggerData.limit : 50;
    if (!triggerData.triggerFields || !triggerData.triggerFields.alert_ids) {
      throw new TriggerFieldsError();
    }
    const alertIds = triggerData.triggerFields.alert_ids;
    const alertsFilter = alertIds && alertIds.split(',').filter(alarmId => alarmId).map(alarmId => parseInt(alarmId.trim(), 10));

    return this.generateAlertEvents(severity, alertsFilter || undefined, limit);
  }

  public async openValveAction(userId: string, directiveService: DirectiveService): Promise<ActionResponse> {
    return {
      data: [{
        id: uuid.v4()
      }]
    };
  }

  public async closeValveAction(userId: string, directiveService: DirectiveService): Promise<ActionResponse> {
    return {
      data: [{
        id: uuid.v4()
      }]
    };
  }

  public async changeSystemModeAction(userId: string, userAction: ActionData, systemModeService: DeviceSystemModeService): Promise<ActionResponse> {
    if (!userAction.actionFields || !userAction.actionFields.device_mode) {
      throw new ActionFieldsError('Missing system mode field');
    }
    return {
      data: [{
        id: new Date().getTime()
      }]
    };
  }

  public async notifyRealtimeAlert(deviceId: string, triggerId: TriggerId): Promise<void> {
    return Promise.resolve();
  }

  private generateAlertEvents(severity: AlarmSeverity, alertIds: number[] | undefined, limit: number): AlertTriggerResponse {
    let timestamp = 1534977758;

    const alertsData = _.range(5).map(x => {
      return (alertIds || this.getAllAlertsIdsBySeverity(severity)).map((alertId: number) => {
        const eventId = `${alertId}-${this.user.id}-${x}`;

        timestamp = timestamp + 120;

        return {
          alert_id: eventId,
          alert_name: `name-${this.user.id}`,
          system_mode: `${_.capitalize(SystemMode.AWAY)} Mode`,
          full_address: '3760 S Robertson Blvd, Culver City, CA 90232',
          created_at: '2016-09-18T17:34:02.666Z',
          incident_time: timestamp,
          meta: {
            id: eventId,
            timestamp
          }
        };
      });
    });

    const result = _.orderBy(_.flatten(alertsData), ['incident_time'], ['desc']).slice(0, limit);

    return { data: result };
  }

  private getAllAlertsIdsBySeverity(severity: AlarmSeverity): number[] {
    switch (severity) {
      case AlarmSeverity.CRITICAL:
        return [10, 11, 26, 52, 53];
      case AlarmSeverity.WARNING:
        return [13, 14, 15, 16, 18, 22, 23, 28, 29, 30, 31, 33];
      case AlarmSeverity.INFO:
        return [5, 34, 32, 39, 40, 41, 45, 50];
      default:
        return [];
    }
  }
}

export { DefaultIFTTTTestService }
