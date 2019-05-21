import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { InternalDeviceServiceFetcher } from "./InternalDeviceServiceFetcher";

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('DeviceServiceBaseURL').toConstantValue(config.deviceServiceBaseURL);
  bind<InternalDeviceServiceFetcher>('InternalDeviceServiceFetcher').to(InternalDeviceServiceFetcher);
});