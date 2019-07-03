import { inject, injectable, interfaces } from 'inversify';
import { BaseMiddleware } from 'inversify-express-utils';
import Request from '../../core/api/Request';
import express from 'express';
import postgres from 'pg';

export function PostgresPoolClientProviderFactory(context: interfaces.Context, res?: express.Response): () => Promise<postgres.PoolClient> {
  const postgresPool = context.container.get<postgres.Pool>('PostgresPool');

  return async () => {
    const poolClient = await postgresPool.connect();
    let isReleased = false;
    const releaseClient = () => {
      if (!isReleased) {
        poolClient.release();
        isReleased = true;
      }
    };

    if (res) {
      res.on('finish', releaseClient);
      res.on('close', releaseClient);
    }

    return poolClient;
  };
}

@injectable()
class PostgresConnectionMiddleware extends BaseMiddleware {
  @inject('PostgresPool') private postgresPool: postgres.Pool;
  
  public handler(req: Request, res: express.Response, next: express.NextFunction): void {
    this.bind<() =>Promise<postgres.PoolClient>>('PostgresPoolClientProvider')
      .toProvider((context: interfaces.Context) => PostgresPoolClientProviderFactory(context, res));

    next();
  }
}

export { PostgresConnectionMiddleware };