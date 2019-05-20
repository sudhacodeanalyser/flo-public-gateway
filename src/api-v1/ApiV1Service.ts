import axios from 'axios';
import ApiV1Error from './ApiV1Error';
import { injectable } from 'inversify';

export interface ApiV1Request {
  method: string,
  url: string,
  authToken: string,
  body: any
};

@injectable()
class ApiV1Service {
  protected async sendRequest<Response extends {}>(request: ApiV1Request): Promise<Response> {
    try {
      const response = await axios({
        method: request.method,
        url: request.url,
        headers: {
          'Content-Type': 'application/json',
          Authorization: request.authToken
        },
        data: request.body
      });

      return response.data as Response;

    } catch (err) {
      if (!err.response) {
        throw err;
      } else if (err.response.status === 409 || err.response.status === 401 || err.response.status === 403) {
        throw new ApiV1Error(err.response.status, err.response.data.message);
      } else {
        throw err;
      }
    }
  }
}

export { ApiV1Service, ApiV1Error };