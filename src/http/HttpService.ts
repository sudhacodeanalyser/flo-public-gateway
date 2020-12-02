import _ from 'lodash';
import { AxiosInstance, AxiosRequestConfig } from 'axios';
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
        timeout: config.externalServiceHttpTimeoutMs
      };
      if (request.method === 'HEAD') { // fix gzip empty head response err with axios & some http server for HEAD response
        cfg.headers['accept-encoding'] = 'gzip;q=0,deflate,sdch'; // SEE: https://github.com/axios/axios/issues/1658
      }

      const response = await this.httpClient.request(cfg);
      return response.data;
    } catch (err) {
      this.httpLogger.error({ err, request });
      if (!err) {
        throw new HttpError(500, "Unhandled Exception.");
      }

      const status = err.response?.status >= 400 ? err.response.status : 500;
      const message = err.response?.data?.message || _.head(err.response?.data?.errors) || getReasonPhrase(status);
      if (request.proxyError) {
        throw new ExtendableError(message, status, err.response?.data); // proxy error back as is
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
