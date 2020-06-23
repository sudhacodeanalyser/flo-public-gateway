import { ContainerModule, interfaces } from 'inversify';
import config from '../../config/config';
import { ApiNotificationService } from '../../notification/ApiNotificationService';
import { NotificationService, UnAuthNotificationService } from './NotificationService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('notificationApiUrl').toConstantValue(config.notificationApiUrl);
  bind<NotificationService>('NotificationService').to(ApiNotificationService);
  bind<UnAuthNotificationService>('UnAuthNotificationService').to(ApiNotificationService);
});
