import { interfaces, httpGet, queryParam } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { SensorService } from '../service';
import { SensorInterval, SensorMetricsReport } from '../api';
import { httpController } from '../api/controllerUtils';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';
import * as ReqValidator from './SensorReqValidator';

export function SensorControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');

  @httpController({ version: apiVersion }, '/sensors')
  class SensorController implements interfaces.Controller {
    constructor(
      @inject('SensorService') private sensorService: SensorService
    ) {}

    @httpGet('/metrics',
      authMiddlewareFactory.create(
        async ({ query: { macAddress } }: Request) => ({
          device_id: macAddress
        })
      ),
      reqValidator.create(ReqValidator.getMetrics)
    )
    private async getMetrics(
      @queryParam('macAddress') macAddress: string,
      @queryParam('startDate') startDate?: ReqValidator.ISODateString,
      @queryParam('endDate') endDate?: ReqValidator.ISODateString,
      @queryParam('interval') interval?: SensorInterval,
      @queryParam('tz') timezone?: string
    ): Promise<SensorMetricsReport> {
      return this.sensorService.getMetricsAveragesByDevice(macAddress, startDate, endDate, interval, timezone);
    }
  }
  return SensorController;
}