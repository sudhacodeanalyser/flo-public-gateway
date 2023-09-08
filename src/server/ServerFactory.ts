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
import * as _ from 'lodash';
import swaggerUi from 'swagger-ui-express';
// import enforce from 'express-sslify';
import * as uuid from 'uuid';
import { CachePolicy } from '../cache/CacheMiddleware';
import Config from '../config/config';
import ExtendableError from '../core/api/error/ExtendableError';
import Request from '../core/api/Request';
import { internalSwaggerJsDoc, internalSwaggerOpenApiContents, legacySwaggerJsDoc, swaggerInternalOpts, swaggerLegacyOpts, swaggerPartnerOpts, thirdPartiesSwaggerJsDoc, thirdPartiesSwaggerOpenApiContents } from '../docs/swagger';
import LoggerFactory from '../logging/LoggerFactory';
import { Loaders } from '../memoize/MemoizeMixin';
import { InjectableHttpContextUtils } from '../cache/InjectableHttpContextUtils';

function ServerConfigurationFactory(container: Container): (app: express.Application) => void {
  return (app: express.Application) => {
    const config = container.get<typeof Config>('Config');

    app.set('strict routing', true);
    app.set('case sensitive routing', true);
    // Remove "X-Powered-By:Express" header.
    app.set('x-powered-by', false);

    // Attach fix for accessing HttpContext from "injectable" classes
    InjectableHttpContextUtils.attach(app, container);

    app.use(helmet({
      hsts: {
        maxAge: 31536000000, // one year in milliseconds
        preload: true,
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
    app.use(bodyParser.urlencoded({ extended: true }));

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

    container.bind<Loaders>('Loaders').toConstantValue(new Map());
    container.bind<CachePolicy>('CachePolicy').toConstantValue(CachePolicy.READ_WRITE);

    const loggerFactory = container.get<LoggerFactory>('LoggerFactory');
    const logger = loggerFactory.createLogger();

    container.bind<Logger>('Logger').toConstantValue(logger);

    app.use((req: Request, res: express.Response, next: express.NextFunction) => {
      const reqId = res.get('x-request-id');
      const reqLogger = logger.child({
        type: 'request',
        req_id: reqId,
        serializers: {
          ...Logger.stdSerializers,
          req: serializeReq
        }
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

    app.use('/docs/openapi.yaml', internalSwaggerBasicAuth, (req: Request, res: express.Response) => {
      res.set('Content-Type', 'text/x-yaml');
      return res.send(internalSwaggerOpenApiContents);
    });
    app.use('/docs', internalSwaggerBasicAuth, swaggerUi.serve, setupSwaggerUi(internalSwaggerJsDoc, swaggerInternalOpts));


    app.use('/legacy', internalSwaggerBasicAuth, swaggerUi.serve, setupSwaggerUi(legacySwaggerJsDoc, swaggerLegacyOpts));

    app.use('/swagger/openapi.yaml', externalSwaggerBasicAuth, (req: Request, res: express.Response) => {
      res.set('Content-Type', 'text/x-yaml');
      return res.send(thirdPartiesSwaggerOpenApiContents);
    });
    app.use('/swagger', externalSwaggerBasicAuth, swaggerUi.serve, setupSwaggerUi(thirdPartiesSwaggerJsDoc, swaggerPartnerOpts));
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

    const reqId = res.get('x-request-id');
    const errMsg = reqId !== undefined && reqId.length > 1 ? `${genericErrorMessage} (ID: ${reqId})` : genericErrorMessage
    if (err instanceof ExtendableError) {
      res.status(err.statusCode).json({ error: true, message: err.message, ...err.data });
    } else if (isBodyParserError(err as HttpError)) {
      const httpError = err as HttpError;
      const message = httpError.expose ? httpError.message : errMsg;
      res.status(httpError.statusCode).json({ error: true, message });
    } else {
      // Don't expose internal error messages
      res.status(500).json({ error: true, message: errMsg });
    }
  });
}

export default function ServerFactory(container: Container): InversifyExpressServer {
  const server = new InversifyExpressServer(container);

  server.setConfig(ServerConfigurationFactory(container));

  server.setErrorConfig(configureServerErrorHandling);

  return server;
}

function serializeReq(req?: Request | null): any {
  if (!req || !req.connection) {
    return req;
  }

  const headers = req.headers;
  const authorizationHeader = req.get('authorization');
  const {
    authorization,
    Authorization,
    ...sanitizedHeaders
  } = headers;

  return {
    method: req.method,
    url: req.url,
    headers: {
      ...sanitizedHeaders,
      // Do not log signature of token
      authorization: authorizationHeader ?
        authorizationHeader.split('.').slice(0, -1).join('.') :
        authorizationHeader
    },
    remoteAddress: req.connection.remoteAddress,
    remotePort: req.connection.remotePort,
    body: _.isEmpty(req.body) ?
      req.body :
      _.mapValues(req.body, (value, key) => {
        const normalizedKey = key.toLowerCase();
        const sensitiveKeys = [
          'password',
          'token',
          'secret'
        ];
        const isSensitive = sensitiveKeys
          .some(sensitiveKey => normalizedKey.includes(sensitiveKey));

        return isSensitive ?
          '[REDACTED]' :
          value;
      })
  };
}

