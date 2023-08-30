import { ContainerModule, interfaces } from 'inversify';
import postgres from 'pg';
import config from '../../config/config';
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
  )
  .when((request: interfaces.Request) => {
    return (
      !request.target.name.value() && 
      (
        request.parentRequest === null || 
        !request.parentRequest.target.name.value()
      )
    );
  });

  bind<postgres.Pool>('PostgresPool').toConstantValue(
    new postgres.Pool({
      user: config.postgresUser,
      host: config.postgresHost,
      database: 'core',
      password: config.postgresPassword,
      port: config.postgresPort,
      max: config.postgresMaxPoolClients,
      connectionTimeoutMillis: config.postgresConnectionTimeoutMS,
      idleTimeoutMillis: config.postgresIdleTimeoutMS    
    }) 
  )
  .when((request: interfaces.Request) => {
    return (
      request.target.name.equals('core') || 
      (
        request.parentRequest !== null && 
        request.parentRequest.target.name.equals('core')
      )
    );
  });

  bind<PostgresDbClient>('PostgresDbClient').to(PostgresDbClient);
});