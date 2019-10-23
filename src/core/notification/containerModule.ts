import { ContainerModule, interfaces } from 'inversify';
import config from '../../config/config';
import { ApiNotificationServiceFactory } from "../../notification/ApiNotificationServiceFactory";
import { NotificationServiceFactory } from "./NotificationService";

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('notificationApiUrl').toConstantValue(config.notificationApiUrl);
  bind<NotificationServiceFactory>('NotificationServiceFactory').to(ApiNotificationServiceFactory);
});
