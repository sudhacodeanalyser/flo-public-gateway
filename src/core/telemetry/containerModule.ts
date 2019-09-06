import { ContainerModule, interfaces } from 'inversify';
import { TelemetryService } from '../service';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<TelemetryService>('TelemetryService').to(TelemetryService);
  bind<string>('TelemetryKafkaTopic').toConstantValue(config.telemetryKafkaTopic);
});