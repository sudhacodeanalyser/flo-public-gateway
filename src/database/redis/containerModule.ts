import { ContainerModule, interfaces } from 'inversify';
import Redis, { Cluster } from 'ioredis';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<Cluster>('RedisClient').toConstantValue(new Redis.Cluster([{
    host: config.redisHost,
    port: config.redisPort
  }]));
});