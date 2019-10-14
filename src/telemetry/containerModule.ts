import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { TelemetryTagsService } from '../core/telemetry/TelemetryTagsService';
import { ApiTelemetryTagsService } from './ApiTelemetryTagsService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<TelemetryTagsService>('TelemetryTagsService').to(ApiTelemetryTagsService);
  bind<string>('TelemetryTagsServiceUrl').toConstantValue(config.telemetryTagsServiceUrl);
});