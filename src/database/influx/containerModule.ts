import { ContainerModule, interfaces } from 'inversify';
import { InfluxDB } from 'influx';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<InfluxDB>('InfluxDB').toConstantValue(new InfluxDB({
    host: config.influxHost,
    port: config.influxPort,
    protocol: 'https',
    username: config.influxUsername,
    password: config.influxPassword
  }));
  bind<string>('InfluxAnalyticsDb').toConstantValue(config.influxAnalyticsDb);
  bind<string>('InfluxHourlyMeasurement').toConstantValue(config.influxHourlyMeasurement);
  bind<string>('InfluxTelemetryDb').toConstantValue(config.influxTelemetryDb);
  bind<string>('InfluxSecondMeasurement').toConstantValue(config.influxSecondMeasurement);
});