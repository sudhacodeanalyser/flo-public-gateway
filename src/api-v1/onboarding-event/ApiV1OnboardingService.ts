import { inject, injectable } from 'inversify';
import {HttpRequest, HttpService} from '../../http/HttpService';
import { OnboardingService } from '../../core/device/OnboardingService';

@injectable()
class ApiV1OnboardingService extends HttpService implements OnboardingService {
  constructor(
    @inject('ApiV1Url') public readonly apiV1Url: string
  ) {
    super();
  }

  public async markDeviceInstalled(macAddress: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/onboarding/event/device/installed`,
      authToken: this.httpContext && this.httpContext.request && this.httpContext.request.get('Authorization'),
      body: {
        device_id: macAddress,
      }
    };

    await this.sendRequest(request);
  }
}

export { ApiV1OnboardingService };
