import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('DeviceServiceBaseURL').toConstantValue(config.deviceServiceBaseURL);
});