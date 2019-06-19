import { ContainerModule, interfaces } from 'inversify';
import config from '../../config/config';
import {NotificationServiceFactory} from "./NotificationService";
import {ApiNotificationServiceFactory} from "../../notification/ApiNotificationServiceFactory";

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('notificationApiUrl').toConstantValue(config.notificationApiUrl);
  bind<NotificationServiceFactory>('NotificationServiceFactory').to(ApiNotificationServiceFactory);
});