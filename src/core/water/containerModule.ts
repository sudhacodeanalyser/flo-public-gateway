import { ContainerModule, interfaces } from 'inversify';
import { WaterService } from '../service';
import { WaterMeterService } from './WaterMeterService';
import { WeatherApi } from './WeatherApi';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<WaterService>('WaterService').to(WaterService);
  bind<WaterMeterService>('WaterMeterService').to(WaterMeterService);
  bind<string>('WaterMeterUrl').toConstantValue(config.waterMeterUrl);
  bind<WeatherApi>('WeatherApi').to(WeatherApi);
  bind<string>('WeatherApiUrl').toConstantValue(config.weatherApiUrl);
});