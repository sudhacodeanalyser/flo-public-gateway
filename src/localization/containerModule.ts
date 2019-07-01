import { ContainerModule, interfaces } from 'inversify';
import { LocalizationService } from '../core/service';
import { LocalizationApiService } from './LocalizationApiService';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('LocalizationApiUrl').toConstantValue(config.localizationApiUrl);
  bind<LocalizationService>('LocalizationService').to(LocalizationApiService);
});