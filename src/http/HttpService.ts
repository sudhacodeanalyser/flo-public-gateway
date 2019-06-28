import axios from 'axios';
import HttpError from './HttpError';
import { injectable } from 'inversify';

export interface HttpRequest {
  method: string,
  url: string,
  authToken?: string,
  body?: any,
  params?: any
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
          ...(request.authToken && { Authorization: request.authToken })
        },
        ...(request.body && { data: request.body }),
        ...(request.params && { params: request.params })
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