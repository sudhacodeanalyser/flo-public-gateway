import { injectable, inject } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import { NotificationService } from '../notification/NotificationService';
import * as _ from 'lodash';
import { AlarmListResult, Alarm } from '../api';

@injectable()
class AlarmService {

  constructor(
    @inject('NotificationService') private notificationService: NotificationService,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext
  ) {}

  public async getAlarms(queryParams: any): Promise<AlarmListResult> {
    return this.notificationService.getAlarms(queryParams);
  }

  public async getAlarmById(id: string, queryParams: any): Promise<Alarm> {
    return this.notificationService.getAlarmById(id, queryParams);
  }
}

export { AlarmService };
