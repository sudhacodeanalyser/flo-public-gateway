import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { InternalDeviceServiceFetcher } from "./InternalDeviceServiceFetcher";

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('InternalDeviceServiceBaseURL').toConstantValue(config.internalDeviceServiceBaseURL);
  bind<InternalDeviceServiceFetcher>('InternalDeviceServiceFetcher').to(InternalDeviceServiceFetcher);
});