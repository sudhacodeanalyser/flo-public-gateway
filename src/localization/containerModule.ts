import { ContainerModule, interfaces } from 'inversify';
import { LocalizationService } from '../core/service';
import { LocalizationApiService } from './LocalizationApiService';
import config from '../config/config';
import LocaleMiddleware from './LocaleMiddleware';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('LocalizationApiUrl').toConstantValue(config.localizationApiUrl);
  bind<LocalizationService>('LocalizationService').to(LocalizationApiService);
  bind<LocaleMiddleware>('LocaleMiddleware').to(LocaleMiddleware);
  bind<string | undefined>('Locale').toConstantValue(undefined);
});