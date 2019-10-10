import { ContainerModule, interfaces } from 'inversify';
import config from '../../config/config';
import { TelemetryService } from '../service';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<TelemetryService>('TelemetryService').to(TelemetryService);
  bind<string>('TelemetryKafkaTopic').toConstantValue(config.telemetryKafkaTopic);
  bind<string>('PuckTelemetryKafkaTopic').toConstantValue(config.puckTelemetryKafkaTopic);
});