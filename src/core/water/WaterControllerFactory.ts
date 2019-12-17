import { interfaces, controller, httpGet, requestParam, queryParam } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { WaterService } from '../service';
import { WaterConsumptionReport, WaterAveragesReport, WaterConsumptionInterval, WaterMetricsReport } from '../api';
import { httpController } from '../api/controllerUtils';
import moment from 'moment';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';
import * as ReqValidator from './WaterReqValidator';

export function WaterControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithMacAddressOrLocationId = authMiddlewareFactory.create(
    async ({ query: { locationId, macAddress } }: Request) => ({ 
      location_id: locationId, device_id: macAddress
    })
  );

  @httpController({ version: apiVersion }, '/water')
  class WaterController implements interfaces.Controller {
    constructor(
      @inject('WaterService') private waterService: WaterService
    ) {}

    @httpGet('/consumption',
      authWithMacAddressOrLocationId,
      reqValidator.create(ReqValidator.getConsumption)
    )
    private async getConsumption(
      @queryParam('startDate') startDate: ReqValidator.ISODateString, 
      @queryParam('endDate') endDate?: ReqValidator.ISODateString, 
      @queryParam('macAddress') macAddress?: string,
      @queryParam('locationId') locationId?: string,
      @queryParam('interval') interval?: WaterConsumptionInterval,
      @queryParam('tz') timezone?: string
    ): Promise<WaterConsumptionReport | void> {
      if (locationId) {
        return this.waterService.getLocationConsumption(locationId, startDate, endDate, interval, timezone);        
      } else if (macAddress) {
        return this.waterService.getDeviceConsumption(macAddress, startDate, endDate, interval, timezone);
      }
    }

    @httpGet('/averages',
      authWithMacAddressOrLocationId,
      reqValidator.create(ReqValidator.getAverages)
    )
    private async getAverages(
      @queryParam('locationId') locationId?: string,
      @queryParam('macAddress') macAddress?: string,
      @queryParam('tz') timezone?: string
    ): Promise<WaterAveragesReport | void> {
      if (locationId) {
        return this.waterService.getDailyAverageConsumptionByLocationId(locationId, timezone);
      } else if (macAddress) {
        return this.waterService.getDailyAverageConsumptionByDevice(macAddress, timezone);
      }
    }

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
      @queryParam('startDate') startDate: ReqValidator.ISODateString, 
      @queryParam('endDate') endDate?: ReqValidator.ISODateString, 
      @queryParam('interval') interval?: WaterConsumptionInterval,
      @queryParam('tz') timezone?: string 
    ): Promise<WaterMetricsReport> {
      return this.waterService.getMetricsAveragesByDevice(macAddress, startDate, endDate, interval, timezone);
    }
  }
  return WaterController;
}