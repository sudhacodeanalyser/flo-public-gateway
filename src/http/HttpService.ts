import * as _ from 'lodash';
import { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { injectable, inject } from 'inversify';
import HttpError from './HttpError';
import config from '../config/config';
import { interfaces } from 'inversify-express-utils';
import { injectableHttpContext } from '../cache/InjectableHttpContextUtils';
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
  @injectableHttpContext protected readonly httpContext: interfaces.HttpContext;
  @inject('HttpClient') protected readonly httpClient: AxiosInstance;
  @inject('Logger') private readonly httpLogger: Logger;

  public async sendRequest(request: HttpRequest): Promise<any> {
    try {
      const httpContextReq = this.httpContext && this.httpContext.request;
      const cfg: AxiosRequestConfig = {
        method: request.method,
        url: this.baseUrl ? `${this.baseUrl}${request.url}` : request.url,
        headers: {
          'Content-Type': 'application/json',
          ...((request.authToken || this.authToken) && { Authorization: request.authToken || this.authToken }),
          ...(request.customHeaders),
          ...(httpContextReq && { Referer: httpContextReq.protocol + '://' + httpContextReq.get('host') + httpContextReq.originalUrl })
        },
        ...(request.body && { data: request.body }),
        ...(request.params && { params: request.params }),
        timeout: Number(config.externalServiceHttpTimeoutMs)
      };
      if (cfg.headers && request.method?.toUpperCase() === 'HEAD') { // fix gzip empty HEAD response err with axios & some http servers by forcing no compression
        cfg.headers['accept-encoding'] = 'gzip;q=0,deflate,sdch'; // SEE: https://github.com/axios/axios/issues/1658
      }

      const response = await this.httpClient.request(cfg);
      return response.data;
    } catch (err: any) {
      this.httpLogger.error({ err, request });
      if (!err) {
        throw new HttpError(500, "Unknown Exception.");
      }

      let status = (err.response?.status || 500); 
      status = status >= 400 ? status : 500;
      const body: any = err.response?.data ?? {};
      const message = body.message || _.head(body.errors) || getReasonPhrase(status);
      if (request.proxyError) {
        throw new ExtendableError(message, status, body); // proxy error back as is
      }
      if (status < 500) {
        throw new HttpError(status, message);
      }
      throw err;
    }
  }
}

export type HttpServiceFactory = (baseUrl?: string, authToken?: string, headers?: any) => HttpService;

export { HttpService, HttpError };
