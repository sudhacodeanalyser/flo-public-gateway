import bodyParser from 'body-parser';
import Logger from 'bunyan';
import cors from 'cors';
import express from 'express';
import basicAuth from 'express-basic-auth';
import helmet from 'helmet';
// tslint:disable-next-line:no-implicit-dependencies
import { HttpError } from 'http-errors';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';
import _ from 'lodash';
import swaggerUi from 'swagger-ui-express';
// import enforce from 'express-sslify';
import uuid from 'uuid';
import Config from '../config/config';
import ExtendableError from '../core/api/error/ExtendableError';
import Request from '../core/api/Request';
import { internalSwaggerJsDoc, legacySwaggerJsDoc, swaggerOpts, thirdPartiesSwaggerJsDoc } from '../docs/swagger';
import LoggerFactory from '../logging/LoggerFactory';


function ServerConfigurationFactory(container: Container): (app: express.Application) => void {
  return (app: express.Application) => {
    const config = container.get<typeof Config>('Config');

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

    app.use((req: Request, res: express.Response, next: express.NextFunction) => {
      req.rawBody = '';

      req.on('data', (chunk) => {
        req.rawBody += chunk;
      });

      next();
    });

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

    // Swagger Documentation
    const swaggerBasicAuth = (user: string, password: string) => basicAuth({
      challenge: true,
      realm: `${config.appName}-${config.env}`,
      users: {
        [user]: password
      }
    });
    const internalSwaggerBasicAuth = swaggerBasicAuth(config.docsEndpointUser, config.docsEndpointPassword);
    const externalSwaggerBasicAuth = swaggerBasicAuth(config.externalDocsEndpointUser, config.externalDocsEndpointPassword);

    const setupSwaggerUi = (swaggerJsDoc: {[key: string]: any}, opts: {[key: string]: any}) =>
      (req: Request, res: express.Response, next: express.NextFunction) => swaggerUi.setup(swaggerJsDoc, opts)(req, res, next);

    app.use('/docs', internalSwaggerBasicAuth, swaggerUi.serve, setupSwaggerUi(internalSwaggerJsDoc, swaggerOpts));
    app.use('/legacy', internalSwaggerBasicAuth, swaggerUi.serve, setupSwaggerUi(legacySwaggerJsDoc, swaggerOpts));
    app.use('/swagger', externalSwaggerBasicAuth, swaggerUi.serve, setupSwaggerUi(thirdPartiesSwaggerJsDoc, swaggerOpts));
  };
}

function configureServerErrorHandling(app: express.Application): void {
  // TODO: Find a better way of handling this exception.
  // We need to do this since body-parser may return HttpError or SyntaxError
  // (both Errors contain a type attribute)
  const isBodyParserError = (err: HttpError) => !_.isUndefined(err.type)
  const genericErrorMessage = 'Something went wrong';

  app.use((err: Error, req: Request, res: express.Response, next: express.NextFunction) => {
    const logger: Logger | undefined = req.log;

    if (logger !== undefined) {
      logger.error({ err });
    }

    if (err instanceof ExtendableError) {
      res.status(err.statusCode).json({ error: true, message: err.message, ...err.data });
    } else if (isBodyParserError(err as HttpError)) {
      const httpError = err as HttpError;
      const message = httpError.expose ? httpError.message : genericErrorMessage;
      res.status(httpError.statusCode).json({ error: true, message });
    } else {
      // Don't expose internal error messages
      res.status(500).json({ error: true, message: genericErrorMessage });
    }
  });
}

export default function ServerFactory(container: Container): InversifyExpressServer {
  const server = new InversifyExpressServer(container);

  server.setConfig(ServerConfigurationFactory(container));

  server.setErrorConfig(configureServerErrorHandling);

  return server;
}
