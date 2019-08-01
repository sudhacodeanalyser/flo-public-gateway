import { injectable } from 'inversify';
import _ from 'lodash';
import { HealthTest, HealthTestService } from '../core/device/HealthTestService';
import { HttpService } from '../http/HttpService';

@injectable()
export class DefaulthHealthTestService extends HttpService implements HealthTestService {
  constructor(
    private readonly healthTestServiceUrl: string,
    private readonly authToken: string
  ) {
    super();
  }

  public async run(deviceMacAddress: string, icdId: string): Promise<HealthTest> {
    const request = {
      method: 'POST',
      url: `${this.healthTestServiceUrl}/healthtest`,
      customHeaders: {
        "X-User-Authorization": this.authToken
      },
      body: {
        deviceId: deviceMacAddress,
        icdId
      }
    };

    return this.sendRequest(request);
  }

  public async getLatest(deviceMacAddress: string): Promise<HealthTest | null> {
    const request = {
      method: 'GET',
      url: `${this.healthTestServiceUrl}/healthtest?deviceId=${deviceMacAddress}&sort=desc&limit=1`
    };

    const { items } = await this.sendRequest(request);

    return _.first(items) || null;
  }

  public async getTestResultByRoundId(roundId: string): Promise<HealthTest | null> {
    const request = {
      method: 'GET',
      url: `${this.healthTestServiceUrl}/healthtest/${roundId}`
    };

    const item = await this.sendRequest(request);

    return item || null;
  }
}