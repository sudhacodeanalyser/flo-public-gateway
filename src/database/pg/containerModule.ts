import { ContainerModule, interfaces } from 'inversify';
import postgres from 'pg';
import config from '../../config/config';
import { PostgresConnectionMiddleware, PostgresPoolClientProviderFactory } from './PostgresConnectionMiddleware';
import { DatabaseReadClient } from '../DatabaseClient';
import { PostgresDbClient } from './PostgresDbClient';

export default new ContainerModule((bind: interfaces.Bind) => {
  
  bind<postgres.Pool>('PostgresPool').toConstantValue(
    new postgres.Pool({
      user: config.postgresUser,
      host: config.postgresHost,
      database: config.postgresDatabase,
      password: config.postgresPassword,
      port: config.postgresPort,
      max: config.postgresMaxPoolClients,
      connectionTimeoutMillis: config.postgresConnectionTimeoutMS,
      idleTimeoutMillis: config.postgresIdleTimeoutMS    
    }) 
  );

  // This binding will be overridden by the middleware when included
  bind<() => Promise<postgres.PoolClient>>('PostgresPoolClientProvider').toProvider(PostgresPoolClientProviderFactory);
  bind<PostgresConnectionMiddleware>('PostgresConnectionMiddleware').to(PostgresConnectionMiddleware);
  bind<PostgresDbClient>('PostgresDbClient').to(PostgresDbClient);
});