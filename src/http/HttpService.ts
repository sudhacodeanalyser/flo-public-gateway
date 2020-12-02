import _ from 'lodash';
import { AxiosInstance } from 'axios';
import { injectable, inject } from 'inversify';
import HttpError from './HttpError';
import config from '../config/config';
import { HttpResponseMessage, injectHttpContext, interfaces } from 'inversify-express-utils';
import Logger from 'bunyan';
import ExtendableError from '../core/api/error/ExtendableError';
import { getReasonPhrase } from 'http-status-codes';

export interface HttpRequest {
  method: string;
  url: string;
  authToken?: string;
  customHeaders?: any;
  body?: any;
  params?: any;
  proxyError?: boolean;
}

@injectable()
class HttpService {
  public baseUrl?: string;
  public authToken?: string;
  @inject('HttpClient') protected readonly httpClient: AxiosInstance;
  @injectHttpContext protected readonly httpContext: interfaces.HttpContext;
  @inject('Logger') private readonly httpLogger: Logger;

  public async sendRequest(request: HttpRequest): Promise<any> {
    try {
      const httpContextReq = this.httpContext && this.httpContext.request;
      const url = this.baseUrl ? `${this.baseUrl}${request.url}` : request.url;
      const cfg = {
        headers: {
          'Content-Type': 'application/json',
          ...((request.authToken || this.authToken) && { Authorization: request.authToken || this.authToken }),
          ...(request.customHeaders),
          ...(httpContextReq && { Referer: httpContextReq.protocol + '://' + httpContextReq.get('host') + httpContextReq.originalUrl }),
        },
        ...(request.params && { params: request.params }),
        timeout: config.externalServiceHttpTimeoutMs
      };

      let response: any;
      if (request.method === 'HEAD') {
        cfg.headers['accept-encoding'] = 'gzip;q=0,deflate,sdch';
        response = await this.httpClient.head(url, cfg);
      } else {
        const fullCfg = {
          'method': request.method,
          'url': url,
          ...cfg,
          ...(request.body && { data: request.body }),
        };
        response = await this.httpClient.request(fullCfg);
      }

      return response.data;
    } catch (err) {
      this.httpLogger.error({ err, request });
      if (err) {
        const status = err?.response?.status >= 400 ? err.response.status : 500;
        const message = err?.response?.data?.message || _.head(err?.response?.data?.errors) || getReasonPhrase(status);
        if (request.proxyError) {
          throw new ExtendableError(message, status, err.response?.data); // proxy error back as is
        }
        if (status < 500) {
          throw new HttpError(status, message);
        }
        throw err;
      }
      throw new HttpError(500, "Unhandled Exception.");
    }
  }
}

export type HttpServiceFactory = (baseUrl?: string, authToken?: string, headers?: any) => HttpService;

export { HttpService, HttpError };
