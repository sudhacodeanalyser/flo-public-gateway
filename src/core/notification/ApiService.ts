import axios from 'axios';
import ApiV1Error from '../../api-v1/ApiV1Error';
import { injectable } from 'inversify';

export interface ApiRequest {
  method: string,
  url: string,
  authToken?: string,
  body?: any
};

@injectable()
class ApiService {
  constructor(private baseUrl: string) {}

  public async sendRequest(request: ApiRequest): Promise<any> {
    try {
      const response = await axios({
        method: request.method,
        url: `${this.baseUrl}${request.url}`,
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

export { ApiService, ApiV1Error };