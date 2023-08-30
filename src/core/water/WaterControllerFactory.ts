import {
  interfaces,
  httpGet,
  queryParam,
  httpPost,
  requestBody,
  request,
} from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { WaterService, LocationService, DeviceService } from '../service';
import { WaterConsumptionReport, WaterAveragesReport, WaterConsumptionInterval, WaterMetricsReport, DependencyFactoryFactory } from '../api';
import { httpController, httpMethod, queryParamArray } from '../api/controllerUtils';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../api/Request';
import * as ReqValidator from './WaterReqValidator';
import * as O from 'fp-ts/lib/Option';
import * as _ from 'lodash';
import ForbiddenError from '../api/error/ForbiddenError';
import ValidationError from '../api/error/ValidationError';

export function WaterControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const grafanAuth = authMiddlewareFactory.create(undefined, 'ALL/api/v2/water/grafana/*');
  const authWithMacAddressOrLocationId = authMiddlewareFactory.create(
    async ({ query: { locationId, macAddress } }: Request) => ({
      location_id: locationId, device_id: macAddress
    })
  );
  const authWithParents = authMiddlewareFactory.create(async ({ query: { locationId, macAddress, userId } }: Request, depFactoryFactory: DependencyFactoryFactory) => {
    if (locationId) {
      const locationService = depFactoryFactory<LocationService>('LocationService')();
      const locationIds = Array.isArray(locationId) ? locationId.map(l => l.toString()) : locationId.toString().split(',');
      const allParentIds = _.flatten(await Promise.all(_.map(locationIds, async l => locationService.getAllParentIds(l))));

      return {
        location_id: [...locationIds, ...allParentIds]
      };

    } else if (macAddress) {
      const deviceService = depFactoryFactory<DeviceService>('DeviceService')();
      const locationService = depFactoryFactory<LocationService>('LocationService')();
      const device = O.toNullable(await deviceService.getByMacAddress(macAddress.toString()));

      if (!device) {
        return {
          device_id: macAddress
        };
      }

      const parentIds = await locationService.getAllParentIds(device.location.id);

      return {
        location_id: [device.location.id, ...parentIds]
      };
    } else if (userId) {
      return {
        user_id: userId
      }
    } else {
      return {};
    }
  });

  @httpController({ version: apiVersion }, '/water')
  class WaterController implements interfaces.Controller {
    constructor(
      @inject('WaterService') private waterService: WaterService,
      @inject('LocationService') private locationService: LocationService,
    ) {}

    @httpMethod(
      'get',
      '/consumption',
      reqValidator.create(ReqValidator.getConsumption),
      authWithParents
    )
    private async getConsumption(
      @request() req: Request,
      @queryParam('startDate') startDate: ReqValidator.ISODateString,
      @queryParam('endDate') endDate?: ReqValidator.ISODateString,
      @queryParam('macAddress') macAddress?: string,
      @queryParam('userId') userId?: string,
      @queryParamArray('locationId') locationId?: string[],
      @queryParam('interval') interval?: WaterConsumptionInterval,
      @queryParam('tz') timezone?: string
    ): Promise<WaterConsumptionReport | void> {
      const tokenMetadata = req.token;
      if (tokenMetadata === undefined) {
        throw new Error('No token defined.');
      }

      if (macAddress) {
        return this.waterService.getDeviceConsumption(macAddress, startDate, endDate, interval, timezone);
      } else {
        if (
          !['app.flo-internal-service', 'system.admin'].some(val => tokenMetadata.roles.includes(val)) &&
          locationId &&
          !(await this.locationService.validateLocations(locationId, tokenMetadata.user_id))
        ) {
          throw new ForbiddenError();
        }
        if (['app.flo-internal-service', 'system.admin'].some(val => tokenMetadata.roles.includes(val)) && !locationId) {
          throw new ValidationError('Current user is not allowed to fetch consumption for all locations');
        }
        return this.waterService.getLocationConsumption(locationId, startDate, endDate, interval, timezone, tokenMetadata.user_id);
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
      authWithParents,
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

    @httpGet('/grafana', grafanAuth)
    private async ping(): Promise<void> {
      return this.waterService.ping();
    }

    @httpPost('/grafana/search', grafanAuth)
    private async getAvailableMetrics(@requestBody() availableMetricsReq: any): Promise<any> {
      return this.waterService.getAvailableMetrics(availableMetricsReq);
    }

    @httpPost('/grafana/query', grafanAuth)
    private async queryMetrics(@requestBody() queryMetricsReq: any): Promise<any> {
      return this.waterService.queryMetrics(queryMetricsReq);
    }

    @httpPost('/grafana/annotations', grafanAuth)
    private async annotations(@requestBody() annotationsRequest: any): Promise<any> {
      return this.waterService.annotations(annotationsRequest);
    }

    @httpPost('/grafana/tag-keys', grafanAuth)
    private async tagKeys(@requestBody() tagKeysReq: any): Promise<any> {
      return this.waterService.tagKeys(tagKeysReq);
    }

    @httpPost('/grafana/tag-values', grafanAuth)
    private async tagValues(@requestBody() tagValuesReq: any): Promise<any> {
      return this.waterService.tagValues(tagValuesReq);
    }
  }
  return WaterController;
}