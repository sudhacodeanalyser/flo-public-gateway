import { ContainerModule, interfaces } from 'inversify';
import { SensorService } from '../service';
import config from '../../config/config';
import { SensorMeterService } from './SensorMeterService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<SensorMeterService>('SensorMeterService').to(SensorMeterService);
  bind<SensorService>('SensorService').to(SensorService);
  bind<string>('SensorMeterUrl').toConstantValue(config.sensorMeterUrl);
});