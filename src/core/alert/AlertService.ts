import { injectable, inject } from 'inversify';
import AlertFeedbackTable from './AlertFeedbackTable';
import { AlertFeedbackRecord } from './AlertFeedbackRecord';
import { AlarmEvent, UserFeedback, UserFeedbackCodec, PaginatedResult, AlertFeedback } from '../api';
import * as Option from 'fp-ts/lib/Option';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { NotificationServiceFactory, NotificationService } from '../notification/NotificationService';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import ForbiddenError from '../api/error/ForbiddenError';

@injectable()
class AlertService {
  private notificationServiceFactory: () => NotificationService;

  constructor(
    @inject('AlertFeedbackTable') private alertFeedbackTable: AlertFeedbackTable,
    @inject('NotificationServiceFactory') notificationServiceFactory: NotificationServiceFactory,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext
  ) {

    this.notificationServiceFactory = () => {
      if (_.isEmpty(this.httpContext)) {
        throw new Error('HTTP context unavailable.');
      }

      return notificationServiceFactory.create(this.httpContext.request)
    };
  }

  public async submitFeedback(alarmEvent: AlarmEvent, userFeedback: UserFeedback, userId?: string): Promise<UserFeedback> {
    const alertFeedback = {
      userFeedback: userFeedback.feedback,
      incidentId: alarmEvent.id,
      deviceId: alarmEvent.deviceId,
      createdAt: new Date().toISOString()
    };

    const alertFeedbackRecord = AlertFeedbackRecord.fromModel({
      userId,
      alarmId: alarmEvent.alarm.id,
      systemMode: alarmEvent.systemMode,
      createdAt: new Date().toISOString(),
      ...alertFeedback
    });

    const createdAlertFeedback = AlertFeedbackRecord.toModel(await this.alertFeedbackTable.put(alertFeedbackRecord));

    return {
      userId,
      createdAt: createdAlertFeedback.createdAt,
      feedback: createdAlertFeedback.userFeedback
    };
  }



  public async getAlarmEventsByFilter(filters: string): Promise<PaginatedResult<AlarmEvent>> {
    const alarmEvents = await this.notificationServiceFactory().getAlarmEventsByFilter(filters);
    const alarmEventsWithFeedback = await Promise.all(
      alarmEvents.items.map(async alarmEvent => this.joinAlarmEventWithFeedback(alarmEvent))
    );

    return {
      ...alarmEvents,
      items: alarmEventsWithFeedback
    }
  }

  public async getAlarmEvent(incidentId: string, lang?: string): Promise<AlarmEvent> {
    const alarmEvent = await this.notificationServiceFactory().getAlarmEvent(incidentId, lang ? { lang } : undefined);

    return this.joinAlarmEventWithFeedback(alarmEvent);
  }

  private async joinAlarmEventWithFeedback(alarmEvent: AlarmEvent): Promise<AlarmEvent> {

    return pipe(
      await this.getFeedback(alarmEvent.deviceId, alarmEvent.id),
      Option.fold(
        () => Either.left([]),
        alertFeedback =>
          t.exact(UserFeedbackCodec).decode({
            userId: alertFeedback.userId,
            createdAt: alertFeedback.createdAt,
            feedback: alertFeedback.userFeedback
          })
      ),
      Either.fold(
        () => alarmEvent,
        userFeedback => ({ ...alarmEvent, userFeedback: [userFeedback] })
      )
    );
  }

  private async getFeedback(deviceId: string, incidentId: string): Promise<Option.Option<AlertFeedback>> {
    return pipe(
      Option.fromNullable(await this.alertFeedbackTable.get({ icd_id: deviceId, incident_id: incidentId })),
      Option.map(alertFeedbackRecord => AlertFeedbackRecord.toModel(alertFeedbackRecord))
    );
  }
}

export { AlertService };
