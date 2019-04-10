import express from 'express';
import _ from 'lodash';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import cors from 'cors';
// import enforce from 'express-sslify';
import uuid from 'uuid';
import { Container } from 'inversify';
import { interfaces, InversifyExpressServer, TYPE } from 'inversify-express-utils';
import LoggerFactory from './utils/LoggerFactory';
import Logger from 'bunyan';
import Request from './utils/Request';

function ServerConfigurationFactory(container: Container) {
  return (app: express.Application) => {
    const config = container.get('Config');

    app.set('strict routing', true);
    app.set('case sensitive routing', true);
    // Remove "X-Powered-By:Express" header.
    app.set('x-powered-by', false);

    app.use(helmet({
      hsts: {
        maxAge: 31536000000, // one year in milliseconds
        force: true,
        includeSubDomains: true
      }
    }));

    app.use(bodyParser.json());

    // if (config.enforceSSL) {
    //   app.use(enforce.HTTPS({ trustProtoHeader: true }));
    // }

    app.use(cors({
      credentials: true,
      origin: '*',
      methods: ['HEAD', 'GET', 'PUT', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
    }));

    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.setHeader('x-request-id', uuid.v4());
      next();
    });

    const loggerFactory = container.get<LoggerFactory>('LoggerFactory');
    const logger = loggerFactory.createLogger();

    container.bind<Logger>('Logger').toConstantValue(logger);

    app.use((req: Request, res: express.Response, next: express.NextFunction) => {
      const reqId = res.get('x-request-id');
      const reqLogger = logger.child({
        type: 'request',
        req_id: reqId,
        serializers: Logger.stdSerializers
      });

      req.log = reqLogger;

      const time = process.hrtime();

      const logResponse = () => {
        const diff = process.hrtime(time);
        const duration = diff[0] * 1e3 + diff[1] * 1e-6;

        reqLogger.info({ res, duration });
      };

      res.on('finish', logResponse);
      res.on('close', logResponse);

      req.log.info({ req });

      next();
    });
  };
}

function configureServerErrorHandling(app: express.Application) {
  app.use((err: Error, req: Request, res: express.Response, next: express.NextFunction) => {
    const logger: Logger | undefined = req.log;

    if (logger) {
      logger.error({ err });
    }

    res.status(500).json({ error: true });
  });
}

export default function ServerFactory(container: Container) {
  const server = new InversifyExpressServer(container);

  server.setConfig(ServerConfigurationFactory(container));

  server.setErrorConfig(configureServerErrorHandling);

  return server;
}

