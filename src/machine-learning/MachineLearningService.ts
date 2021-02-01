import { injectable, inject } from 'inversify';
import { HttpService } from '../http/HttpService';
import { memoized, MemoizeMixin } from '../memoize/MemoizeMixin';

@injectable()
class MachineLearningService extends MemoizeMixin(HttpService) {
  @inject('MachineLearningServiceURL') private readonly mlServiceUrl: string;

  public async forward(method: string, path: string, payload?: any): Promise<any> {
    const request = {
      method,
      url: `${ this.mlServiceUrl }/devices/${ path }`,
      body: payload
    };

    return this.sendRequest(request);
  }

  public async update(macAddress: string, payload: { pes?: any, floSense?: any }): Promise<any> {
    return this.forward('POST', macAddress, {
      macAddress,
      ...payload
    });
  }

  @memoized()
  public async get(macAddress: string): Promise<{ pes: any, floSense: any }> {
    return this.forward('GET', macAddress);
  }

  @memoized()
  public async getLearning(macAddress: string): Promise<{ expiresOnOrAfter?: string, enabled: boolean }> {
    return this.forward('GET', `${macAddress}/learning`);
  }

  public async updateLearning(macAddress: string, payload: { learning: any }): Promise<any> {
    return this.forward('POST', `${macAddress}/learning`, { ...payload });
  }

  public async syncPesSchedule(macAddress: string): Promise<any> {
    return this.forward('POST', `${macAddress}/pes/schedule/sync`);
  }

  public async syncFloSenseModel(macAddress: string): Promise<any> {
    return this.forward('POST', `${macAddress}/floSense/models/sync`);
  }
}

export { MachineLearningService };