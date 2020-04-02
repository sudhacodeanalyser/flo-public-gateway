import { inject, injectable } from 'inversify';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import { ComputedIrrigationSchedule, ComputationStatus } from '../core/device/IrrigationScheduleService';
import { ApiV1IrrigationScheduleService } from '../api-v1/irrigation-schedule/ApiV1IrrigationScheduleService';
import { FloDetectApi } from '../core/flo-detect/FloDetectApi';
import { MemoizeMixin, memoized } from '../memoize/MemoizeMixin';
import Logger from 'bunyan';
import { DeviceService } from '../core/service';
import { DependencyFactoryFactory } from '../core/api';
import * as O from 'fp-ts/lib/Option';
import NotFoundError from '../core/api/error/NotFoundError';

@injectable()
class ComposedIrrigationScheduleService extends ApiV1IrrigationScheduleService {
  @inject('FloDetectApi') private floDetectApi: FloDetectApi;
  @inject('Logger') private readonly logger: Logger;
  @inject('DependencyFactoryFactory') private depFactoryFactory: DependencyFactoryFactory;

  public async getDeviceComputedIrrigationSchedule(id: string): Promise<ComputedIrrigationSchedule> {
    const floDetectSchedule = await this.getFloDetectIrrigationSchedule(id);

    if (floDetectSchedule) {
      return floDetectSchedule;
    }

    const result = await super.getDeviceComputedIrrigationSchedule(id);

    return result;
  }

  @memoized()
  private async getFloDetectIrrigationSchedule(id: string): Promise<ComputedIrrigationSchedule | null> {
    try {
      const deviceService = this.depFactoryFactory<DeviceService>('DeviceService')();

      const device = await deviceService.getDeviceById(id, { $select: { macAddress: true } });

      if (O.isNone(device)) {
        return null;
      }

      const macAddress  = device.value.macAddress;
      const floDetectIrrigationSchedule = await this.floDetectApi.getIrrigationSchedule(macAddress);

      if (floDetectIrrigationSchedule) {
        return {
          status: ComputationStatus.SCHEDULE_FOUND,
          times: floDetectIrrigationSchedule.floDetect.schedule
            .map(({ startTime, endTime }) => [startTime, endTime]),
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