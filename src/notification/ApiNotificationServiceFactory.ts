import { inject, injectable } from 'inversify';
import { ApiService } from "../ApiService";
import UnauthorizedError from '../auth/UnauthorizedError';
import Request from '../core/api/Request';
import { NotificationService, NotificationServiceFactory } from '../core/notification/NotificationService';
import { ApiNotificationService } from './ApiNotificationService';

@injectable()
class ApiNotificationServiceFactory implements NotificationServiceFactory  {

  constructor(
    @inject('notificationApiUrl') private readonly notificationApiUrl: string,
    @inject('defaultFloSenseLevel') private readonly defaultFloSenseLevel: number
  ) {}

  public create(req: Request): NotificationService {
    const authToken = req.get('Authorization');

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return new ApiNotificationService(new ApiService(this.notificationApiUrl, authToken), this.defaultFloSenseLevel);
  }
}

export { ApiNotificationServiceFactory };

