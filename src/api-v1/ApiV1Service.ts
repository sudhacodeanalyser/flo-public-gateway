import axios from 'axios';
import ApiV1Error from './ApiV1Error';
import { injectable } from 'inversify';

export interface ApiV1Request {
  method: string,
  url: string,
  authToken?: string,
  body?: any
};

@injectable()
class ApiV1Service {
  protected async sendRequest(request: ApiV1Request): Promise<any> {
    try {
      const response = await axios({
        method: request.method,
        url: request.url,
        headers: {
          'Content-Type': 'application/json',
          ...(request.authToken && { Authorization: request.authToken })
        },
        ...(request.body && { data: request.body })
      });

      return response.data;

    } catch (err) {
      if (!err.response) {
        throw err;
      } else if (err.response.status >= 400 && err.response.status < 500) {
        throw new ApiV1Error(err.response.status, err.response.data.message);
      } else {
        throw err;
      }
    }
  }
}

export { ApiV1Service, ApiV1Error };