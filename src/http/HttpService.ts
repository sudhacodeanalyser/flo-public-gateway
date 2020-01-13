import { AxiosInstance } from 'axios';
import { injectable, inject } from 'inversify';
import HttpError from './HttpError';
import config from '../config/config';
import { injectHttpContext, interfaces } from 'inversify-express-utils';

export interface HttpRequest {
  method: string;
  url: string;
  authToken?: string;
  customHeaders?: any;
  body?: any;
  params?: any;
};

@injectable()
class HttpService {
  public baseUrl?: string;
  public authToken?: string;
  @inject('HttpClient') protected readonly httpClient: AxiosInstance;
  @injectHttpContext private readonly httpContext: interfaces.HttpContext

  public async sendRequest(request: HttpRequest): Promise<any> {
    try {
      // tslint:disable-next-line:no-console
      console.log(this.baseUrl ? `${this.baseUrl}${request.url}` : request.url);


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
      if (!err.response) {
        throw err;
      } else if (err.response.status >= 400 && err.response.status < 500) {
        throw new HttpError(err.response.status, err.response.data.message);
      } else {
        throw err;
      }
    }
  }
}

export type HttpServiceFactory = (baseUrl?: string, authToken?: string, headers?: any) => HttpService;

export { HttpService, HttpError };

