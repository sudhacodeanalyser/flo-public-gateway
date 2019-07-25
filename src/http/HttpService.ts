import axios from 'axios';
import { injectable } from 'inversify';
import HttpError from './HttpError';
import config from '../config/config';

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
  protected async sendRequest(request: HttpRequest): Promise<any> {
    try {
      const response = await axios({
        method: request.method,
        url: request.url,
        headers: {
          'Content-Type': 'application/json',
          ...(request.authToken && { Authorization: request.authToken }),
          ...(request.customHeaders)
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

export { HttpService, HttpError };
