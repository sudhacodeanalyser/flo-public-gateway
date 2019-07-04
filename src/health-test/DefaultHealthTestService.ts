import { inject, injectable } from 'inversify';
import { HealthTestService } from '../core/device/HealthTestService';
import { HttpService } from '../http/HttpService';

@injectable()
export class DefaulthHealthTestService extends HttpService implements HealthTestService {
  constructor(
    @inject('healthTestServiceUrl') private readonly healthTestServiceUrl: string
  ) {
    super();
  }

  public async run(deviceMacAddress: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${this.healthTestServiceUrl}/healthtest`,
      body: {
        deviceId: deviceMacAddress
      }
    };

    await this.sendRequest(request);
  }

  public async getLatest(deviceMacAddress: string): Promise<void> {
    const request = {
      method: 'GET',
      url: `${this.healthTestServiceUrl}/healthtest?deviceId=${deviceMacAddress}&sort=desc&limit=1`
    };

    await this.sendRequest(request);
  }
}