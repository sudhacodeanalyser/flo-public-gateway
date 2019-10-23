import { inject, injectable } from 'inversify';
import { ApiService } from "../ApiService";
import UnauthorizedError from '../auth/UnauthorizedError';
import Request from '../core/api/Request';
import { NotificationService, NotificationServiceFactory } from '../core/notification/NotificationService';
import { ApiNotificationService } from './ApiNotificationService';
import { DeviceService } from '../core/device/DeviceService';
import { DependencyFactoryFactory } from '../core/api';

@injectable()
class ApiNotificationServiceFactory implements NotificationServiceFactory  {

  private deviceServiceFactory: () => DeviceService;

  constructor(
    @inject('notificationApiUrl') private readonly notificationApiUrl: string,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
  }

  public create(req: Request): NotificationService {
    const authToken = req.get('Authorization');

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return new ApiNotificationService(this.deviceServiceFactory, new ApiService(this.notificationApiUrl, authToken));
  }
}

export { ApiNotificationServiceFactory };

