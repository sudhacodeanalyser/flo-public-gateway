import { ContainerModule, interfaces } from 'inversify';
import config from '../../config/config';
import { AlarmDotcomService } from './AlarmDotcomService'

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('InternalFloAlarmDotcomUrl').toConstantValue(config.internalFloAlarmDotcomUrl);
  bind<AlarmDotcomService>('AlarmDotcomService').to(AlarmDotcomService);
});