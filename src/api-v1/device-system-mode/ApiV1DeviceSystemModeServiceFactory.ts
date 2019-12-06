import { inject, injectable } from 'inversify';
import { DeviceSystemModeServiceFactory, DeviceSystemModeService } from '../../core/device/DeviceSystemModeService';
import Request from '../../core/api/Request';
import UnauthorizedError from '../../auth/UnauthorizedError';

@injectable()
class ApiV1DeviceSystemModeServiceFactory implements DeviceSystemModeServiceFactory  {

  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string,
    @inject('Factory<DeviceSystemModeService>') private deviceSystemModeServiceFactory: (apiV1Url: string, authToken: string, customHeaders: any) => DeviceSystemModeService
  ) {}

  public create(req: Request): DeviceSystemModeService {
    const authToken = req.get('Authorization');
    const customHeaders = {
      'user-agent': req.get('user-agent'),
      'origin': req.get('origin')
    };

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return this.deviceSystemModeServiceFactory(this.apiV1Url, authToken, customHeaders);
  }
}

export { ApiV1DeviceSystemModeServiceFactory };
