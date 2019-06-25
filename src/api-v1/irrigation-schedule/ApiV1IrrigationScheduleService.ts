import { ApiV1Service } from '../ApiV1Service';
import { IrrigationScheduleService, ComputedIrrigationSchedule, DeviceIrrigationAllowedState } from '../../core/device/IrrigationScheduleService';
import { ResponseToComputedIrrigationSchedule, ResponseToDeviceIrrigationAllowedState } from './models';

class ApiV1IrrigationScheduleService extends ApiV1Service implements IrrigationScheduleService {
  constructor(
    private readonly apiV1Url: string,
    private readonly authToken: string
  ) {
    super();
  }

  public async getDeviceComputedIrrigationSchedule(id: string): Promise<ComputedIrrigationSchedule> {
    const request = {
      method: 'GET',
      url: `${ this.apiV1Url }/awaymode/icd/${ id }/irrigation`,
      authToken: this.authToken
    };
    const response = await this.sendRequest(request);
    const result = ResponseToComputedIrrigationSchedule.decode(response);

    if (result.isLeft()) {
      throw new Error('Invalid response.')
    }

    return result.value;
  }

  public async enableDeviceIrrigationAllowedInAwayMode(id: string, times: string[][]): Promise<void> {
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

  public async disableDeviceIrrigationAllowedInAwayMode(id: string): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/awaymode/icd/${ id }/disable`,
      authToken: this.authToken
    };

    await this.sendRequest(request);
  }

  public async getDeviceIrrigationAllowedState(id: string): Promise<DeviceIrrigationAllowedState> {
    const request = {
      method: 'GET',
      url: `${ this.apiV1Url }/awaymode/icd/${ id }`,
      authToken: this.authToken
    };
    const response = await this.sendRequest(request);
    const result = ResponseToDeviceIrrigationAllowedState.decode(response);

    if (result.isLeft()) {
      throw new Error('Invalid response.');
    }

    return result.value;
  }
}

export { ApiV1IrrigationScheduleService };