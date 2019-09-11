import { ContainerModule, interfaces } from 'inversify';
import Redis from 'ioredis';
import config from '../../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<Redis.Cluster>('RedisClient').toConstantValue(new Redis.Cluster([{
    host: config.redisHost,
    port: config.redisPort
  }]));
});