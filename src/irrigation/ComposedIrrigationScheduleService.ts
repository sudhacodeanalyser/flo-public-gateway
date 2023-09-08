import { inject, injectable } from 'inversify';
import { ComputedIrrigationSchedule, ComputationStatus } from '../core/device/IrrigationScheduleService';
import { ApiV1IrrigationScheduleService } from '../api-v1/irrigation-schedule/ApiV1IrrigationScheduleService';
import { FloDetectApi } from '../core/flo-detect/FloDetectApi';
import { memoized } from '../memoize/MemoizeMixin';
import Logger from 'bunyan';
import { DeviceService } from '../core/service';
import { DependencyFactoryFactory } from '../core/api';
import * as O from 'fp-ts/lib/Option';
import NotFoundError from '../core/api/error/NotFoundError';
import moment from 'moment';

@injectable()
class ComposedIrrigationScheduleService extends ApiV1IrrigationScheduleService {
  @inject('FloDetectApi') private floDetectApi: FloDetectApi;
  @inject('Logger') private readonly logger: Logger;
  @inject('DependencyFactoryFactory') private depFactoryFactory: DependencyFactoryFactory;

  public async getDeviceComputedIrrigationSchedule(id: string): Promise<ComputedIrrigationSchedule> {
    const deviceService = this.depFactoryFactory<DeviceService>('DeviceService')();
    const device = await deviceService.getDeviceById(id, { $select: { macAddress: true } });

    if (O.isNone(device)) {
      throw new NotFoundError('Device not found.');
    }
    const macAddress = device.value.macAddress;
    const floDetectSchedule = await this.getFloDetectIrrigationSchedule(macAddress);

    if (floDetectSchedule) {
      return floDetectSchedule;
    }

    return {
      status: ComputationStatus.SCHEDULE_NOT_FOUND,
      times: undefined,
      macAddress: device.value.macAddress
    };
  }

  @memoized()
  private async getFloDetectIrrigationSchedule(macAddress: string): Promise<ComputedIrrigationSchedule | null> {
    try {
      const floDetectIrrigationSchedule = await this.floDetectApi.getIrrigationSchedule(macAddress);

      if (floDetectIrrigationSchedule) {
        return {
          status: ComputationStatus.SCHEDULE_FOUND,
          times: floDetectIrrigationSchedule.floDetect.schedule
            .map(({ startTime, endTime }) => 
              [startTime, endTime].map(time => moment(time, 'HH:mm').format('HH:mm:ss'))
            ),  
          macAddress
        };
      }
    } catch (err) {
      this.logger.error({ err });
    }

    return null;
  }
}

export default ComposedIrrigationScheduleService;