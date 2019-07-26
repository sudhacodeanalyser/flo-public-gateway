import { inject, injectable } from 'inversify';
import { NotificationServiceFactory, NotificationService } from '../core/notification/NotificationService';
import Request from '../core/api/Request';
import UnauthorizedError from '../auth/UnauthorizedError';
import { ApiNotificationService } from './ApiNotificationService';
import {ApiService} from "../ApiService";
import config from "../config/config";

@injectable()
class ApiNotificationServiceFactory implements NotificationServiceFactory  {

  constructor(
    @inject('notificationApiUrl') private readonly notificationApiUrl: string
  ) {}

  public create(req: Request): NotificationService {
    const authToken = req.get('Authorization');

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    // tslint:disable
    console.log("####### ApiNotificationServiceFactory notificationApiUrl");
    console.log(this.notificationApiUrl);

    return new ApiNotificationService(new ApiService(this.notificationApiUrl, authToken));
  }
}

export { ApiNotificationServiceFactory };