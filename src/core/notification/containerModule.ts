import { ContainerModule, interfaces } from 'inversify';
import { NotificationService } from '../service';
import { ApiService } from './ApiService';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<ApiService>('ApiService').toConstantValue(new ApiService(config.notificationApiUrl));
  bind<NotificationService>('NotificationService').to(NotificationService);
});