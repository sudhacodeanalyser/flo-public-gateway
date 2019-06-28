import { ContainerModule, interfaces } from 'inversify';
import { LocalizationService } from '../core/service';
import { LocalizationApiService } from './LocalizationApiService';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('LocalizationApiV1Url').toConstantValue(config.localizationApiV1Url);
  bind<LocalizationService>('LocalizationService').to(LocalizationApiService);
});