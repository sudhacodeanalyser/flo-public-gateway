import { injectable } from 'inversify';
import { HttpService } from '../../http/HttpService';
import { IrrigationScheduleService, ComputedIrrigationSchedule, DeviceIrrigationAllowedState } from '../../core/device/IrrigationScheduleService';
import { ResponseToComputedIrrigationSchedule, ResponseToDeviceIrrigationAllowedState } from './models';
import { isLeft } from 'fp-ts/lib/Either';
import { CacheMixin, cached, cacheKey, dropCache } from '../../cache/CacheMixin';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';

const TWELVE_HOURS = 1036800;

@injectable()
class ApiV1IrrigationScheduleService extends MemoizeMixin(CacheMixin(HttpService)) implements IrrigationScheduleService {
  constructor(
    public apiV1Url: string = '',
    public authToken: string = ''
  ) {
    super();
  }

  @memoized()
  @cached('IrrigationSchedule', TWELVE_HOURS)
  public async getDeviceComputedIrrigationSchedule(@cacheKey() id: string): Promise<ComputedIrrigationSchedule> {
    const request = {
      method: 'GET',
      url: `${ this.apiV1Url }/awaymode/icd/${ id }/irrigation`,
      authToken: this.authToken
    };
    const response = await this.sendRequest(request);
    const result = ResponseToComputedIrrigationSchedule.decode(response);

    if (isLeft(result)) {
      throw new Error('Invalid response.')
    }

    return result.right;
  }

  @dropCache('IrrigationScheduleEnabled')
  public async enableDeviceIrrigationAllowedInAwayMode(@cacheKey() id: string, times: string[][]): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/awaymode/icd/${ id }/enable`,
      authToken: this.authToken,
      body: {
        times
      }
    };

    await this.sendRequest(request);
  }

  @dropCache('IrrigationScheduleEnabled')
  public async disableDeviceIrrigationAllowedInAwayMode(@cacheKey() id: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/awaymode/icd/${ id }/disable`,
      authToken: this.authToken
    };

    await this.sendRequest(request);
  }


  @memoized()
  @cached('IrrigationScheduleEnabled')
  public async getDeviceIrrigationAllowedState(@cacheKey() id: string): Promise<DeviceIrrigationAllowedState> {
    const request = {
      method: 'GET',
      url: `${ this.apiV1Url }/awaymode/icd/${ id }`,
      authToken: this.authToken
    };
    const response = await this.sendRequest(request);
    const result = ResponseToDeviceIrrigationAllowedState.decode(response);

    if (isLeft(result)) {
      throw new Error('Invalid response.');
    }

    return result.right;
  }
}

export { ApiV1IrrigationScheduleService };