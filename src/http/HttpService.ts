import _ from 'lodash';
import { AxiosInstance } from 'axios';
import { injectable, inject } from 'inversify';
import HttpError from './HttpError';
import config from '../config/config';
import { HttpResponseMessage, injectHttpContext, interfaces } from 'inversify-express-utils';
import Logger from 'bunyan';
import ExtendableError from '../core/api/error/ExtendableError';

export interface HttpRequest {
  method: string;
  url: string;
  authToken?: string;
  customHeaders?: any;
  body?: any;
  params?: any;
  proxyError?: boolean | undefined;
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
      const response = await this.httpClient.request({
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
      });

      return response.data;

    } catch (err) {
      this.httpLogger.error({ err, request });
      if(err?.response) {
        if (err.response?.status >= 400 && err.response.status < 500) {
          const message = err.response.data.message || _.head(err.response.data.errors);
          if(request.proxyError && err.response?.data) { // proxy error back as is
            throw new ExtendableError(message, err.response.status, err.response.data);
          }
          if(message) {
            throw new HttpError(err.response.status, message);
          }
        }
      }
      throw err;
    }
  }
}

export type HttpServiceFactory = (baseUrl?: string, authToken?: string, headers?: any) => HttpService;

export { HttpService, HttpError };
