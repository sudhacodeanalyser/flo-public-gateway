import axios from 'axios';
import InternalDeviceServiceError from './internalDeviceServiceError';
import {injectable} from 'inversify';

export interface InternalDeviceServiceRequest {
  method: string,
  url: string,
  body: any
}

@injectable()
class InternalDeviceServiceHandler {
  protected async sendRequest(request: InternalDeviceServiceRequest): Promise<any> {
    try {
      const response = await axios({
        method: request.method,
        url: request.url,
        headers: {
          'Content-Type': 'application/json'
        },
        data: request.body
      });

      return response.data;

    } catch (err) {
      if (!err.response) {
        throw err;
      } else if (err.response.status === 400 || err.response.status === 404 || err.response.status === 500) {
        throw new InternalDeviceServiceError(err.response.status, err.response.data.message);
      } else {
        throw err;
      }
    }
  }
}

export {InternalDeviceServiceHandler, InternalDeviceServiceError};