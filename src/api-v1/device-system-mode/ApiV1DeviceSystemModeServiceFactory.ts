import { inject, injectable } from 'inversify';
import { DeviceSystemModeServiceFactory, DeviceSystemModeService } from '../../core/device/DeviceSystemModeService';
import Request from '../../core/api/Request';
import UnauthorizedError from '../../auth/UnauthorizedError';

@injectable()
class ApiV1DeviceSystemModeServiceFactory implements DeviceSystemModeServiceFactory  {

  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string,
    @inject('ApiV1Token') private readonly apiV1Token: string,
    @inject('Factory<DeviceSystemModeService>') private deviceSystemModeServiceFactory: (apiV1Url: string, authToken: string, customHeaders: any) => DeviceSystemModeService
  ) {}

  public create(req: Request): DeviceSystemModeService {
    const authToken = req.get('Authorization');
    const origin = req.get('origin');
    const userAgent = req.get('user-agent');
    const customHeaders = {
      ...(origin && { origin }),
      ...(userAgent && { 'user-agent': userAgent }),
      ...(authToken && { 'x-user-token': authToken })
    };


    return this.deviceSystemModeServiceFactory(this.apiV1Url, `Bearer ${ this.apiV1Token }`, customHeaders);
  }
}

export { ApiV1DeviceSystemModeServiceFactory };
