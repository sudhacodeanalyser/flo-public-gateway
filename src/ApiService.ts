import axios from 'axios';
import config from './config/config';
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
      const response = await axios({
        method: request.method,
        url: `${this.baseUrl}${request.url}`,
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken && { Authorization: this.authToken })
        },
        ...(request.body && { data: request.body }),
        timeout: config.externalServiceHttpTimeoutMs
      });

      return response.data;
    } catch (err) {
      if (!err.response) {
        throw err;
      } else if (err.response.status >= 400 && err.response.status < 500) {
        throw new ExternalApiError(err.response.status, err.response.data.errors);
      } else {
        throw err;
      }
    }
  }
}

export { ApiService, ExternalApiError };

