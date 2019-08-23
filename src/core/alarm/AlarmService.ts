import { injectable, inject } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import { NotificationServiceFactory, NotificationService } from '../notification/NotificationService';
import _ from 'lodash';
import AlertFeedbackFlowTable from './AlertFeedbackFlowTable';
import { AlarmListResult, Alarm } from '../api';
import { AlertFeedbackFlowRecord } from './AlertFeedbackFlowRecord';

@injectable()
class AlarmService {
  private notificationServiceFactory: () => NotificationService

  constructor(
    @inject('NotificationServiceFactory') notificationServiceFactory: NotificationServiceFactory,
    @inject('AlertFeedbackFlowTable') private alertFeedbackFlowTable: AlertFeedbackFlowTable,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext
  ) {

    this.notificationServiceFactory = () => {
      if (_.isEmpty(this.httpContext)) {
        throw new Error('HTTP context unavailable.');
      }
      
      return notificationServiceFactory.create(this.httpContext.request)
    };
  }

  public async getAlarms(filters: string): Promise<AlarmListResult> {
    const alarms = await this.notificationServiceFactory().getAlarms(filters);
    const alarmsWithFeedbackFlow = await Promise.all(
      alarms.items
        .map(async alarm => this.joinAlarmWithFeedbackFlow(alarm))
    );

    return {
      ...alarms,
      items: alarmsWithFeedbackFlow
    }
  }

  public async getAlarmById(id: string): Promise<Alarm> {
    const alarm = await this.notificationServiceFactory().getAlarmById(id);

    return this.joinAlarmWithFeedbackFlow(alarm);
  }

  private async joinAlarmWithFeedbackFlow(alarm: Alarm): Promise<Alarm> {
    const alertFeedbackFlowRecords = await this.alertFeedbackFlowTable.getByAlarmId(alarm.id);

    return {
      ...alarm,
      userFeedbackFlow: (_.isEmpty(alertFeedbackFlowRecords) ? [] : alertFeedbackFlowRecords)
        .map(alertFeedbackFlow => AlertFeedbackFlowRecord.toModel(alertFeedbackFlow))
    };
  }
}

export { AlarmService };