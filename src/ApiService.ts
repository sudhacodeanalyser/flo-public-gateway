import axios from 'axios';
import ExternalApiError from './ExternalApiError';

export interface ApiRequest {
  method: string,
  url: string,
  body?: any
};

class ApiService {
  constructor(
    private readonly baseUrl: string,
    private readonly authToken?: string
  ) {}

  public async sendRequest(request: ApiRequest): Promise<any> {
    try {
      // tslint:disable
      console.log("####### API URL");
      console.log(`${this.baseUrl}${request.url}`);

      const response = await axios({
        method: request.method,
        url: `${this.baseUrl}${request.url}`,
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { Authorization: this.authToken })
        },
        ...(request.body && { data: request.body })
      });

      // tslint:disable
      console.log("####### API RESPONSE");
      console.log(response);

      return response.data;
    } catch (err) {

      // tslint:disable
      console.log("####### API ERROR");
      console.log(err);

      if (!err.response) {
        throw err;
      } else if (err.response.status >= 400 && err.response.status < 500) {
        throw new ExternalApiError(err.response.status, err.response.data.message);
      } else {
        throw err;
      }
    }
  }
}

export { ApiService, ExternalApiError };