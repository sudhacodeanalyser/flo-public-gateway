import { injectable, inject } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import { NotificationServiceFactory, NotificationService } from '../notification/NotificationService';
import _ from 'lodash';
import { AlarmListResult, Alarm } from '../api';

@injectable()
class AlarmService {
  private notificationServiceFactory: () => NotificationService

  constructor(
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

  public async getAlarms(queryParams: any): Promise<AlarmListResult> {
    return this.notificationServiceFactory().getAlarms(queryParams);
  }

  public async getAlarmById(id: string, queryParams: any): Promise<Alarm> {
    return this.notificationServiceFactory().getAlarmById(id, queryParams);
  }
}

export { AlarmService };
