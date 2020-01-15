import { inject, injectable } from 'inversify';
import UnauthorizedError from '../auth/UnauthorizedError';
import Request from '../core/api/Request';
import {
  NotificationService,
  NotificationServiceFactory,
  UnAuthNotificationService
} from '../core/notification/NotificationService';
import { ApiNotificationService } from './ApiNotificationService';
import { DeviceService } from '../core/device/DeviceService';
import { DependencyFactoryFactory } from '../core/api';
import { HttpService, HttpServiceFactory } from '../http/HttpService';

@injectable()
class ApiNotificationServiceFactory implements NotificationServiceFactory  {

  private deviceServiceFactory: () => DeviceService;

  constructor(
    @inject('notificationApiUrl') private readonly notificationApiUrl: string,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('HttpServiceFactory') private httpServiceFactory: HttpServiceFactory
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
  }

  public create(req: Request): NotificationService {
    const authToken = req.get('Authorization');

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return new ApiNotificationService(this.deviceServiceFactory, this.httpServiceFactory(this.notificationApiUrl, authToken));
  }

  public createNoAuth(req: Request): UnAuthNotificationService {
    return new ApiNotificationService(this.deviceServiceFactory, this.httpServiceFactory(this.notificationApiUrl));
  }
}

export { ApiNotificationServiceFactory };

