import _ from 'lodash';
import express from 'express';
import { interfaces, httpGet, httpPost, httpDelete, httpPut, queryParam, requestParam, requestBody, request, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { Location, LocationUpdateValidator, LocationUpdate, LocationUserRole, LocationCreateValidator, SystemMode, SystemModeCodec } from '../api';
import { LocationService } from '../service';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import { parseExpand, httpController, createMethod, deleteMethod, asyncMethod } from '../api/controllerUtils';
import { NonEmptyArray } from '../api/validator/NonEmptyArray';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import { DeviceSystemModeServiceFactory } from '../device/DeviceSystemModeService';
import Request from '../api/Request';


export function LocationControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ location_id: id }));
  const authWithLocationId = authMiddlewareFactory.create(async ({ params: { locationId } }: Request) => ({ location_id: locationId }));

  interface SystemModeRequestBrand {
    readonly SystemModeRequest: unique symbol;
  }

  const UnbrandedSystemModeRequestCodec = t.type({
    target: SystemModeCodec,
    revertMinutes: t.union([t.undefined, t.Int]),
    revertMode: t.union([t.undefined, SystemModeCodec]),
  });

  type UnbrandedSystemModeRequest = t.TypeOf<typeof UnbrandedSystemModeRequestCodec>;

  const SystemModeRequestCodec = t.brand(
    UnbrandedSystemModeRequestCodec,
    (body): body is t.Branded<UnbrandedSystemModeRequest, SystemModeRequestBrand> => {
      const {
        target,
        revertMinutes,
        revertMode
      } = body;
      // Revert minutes & revert mode must both be specified and
      // can only apply to sleep mode
      if (
        (revertMinutes !== undefined && revertMode === undefined) ||
        (revertMode !== undefined && revertMinutes === undefined) ||
        (revertMinutes !== undefined && revertMode !== undefined && target !== SystemMode.SLEEP) 
      ) {
        return false;
      } else {
        return true;
      }
    },
    'SystemModeRequest'
  );

  type SystemModeRequest = t.TypeOf<typeof SystemModeRequestCodec>;

  @httpController({ version: apiVersion }, '/locations')
  class LocationController extends BaseHttpController {
    constructor(
      @inject('LocationService') private locationService: LocationService,
      @inject('DeviceSystemModeServiceFactory') private deviceSystemModeServiceFactory: DeviceSystemModeServiceFactory
    ) {
      super();
    }

    @httpPost(
      '/',
      authMiddlewareFactory.create(
        async ({ body }: Request) => ({ account_id: _.get(body, 'account.id', null) })
      ),
      reqValidator.create(t.type({
        body: LocationCreateValidator
      }))
    )
    @createMethod
    private async createLocation(@requestBody() location: Location): Promise<Location | {}> {
      return this.locationService.createLocation(location);
    }

    @httpGet(
      '/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    private async getLocation(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Location | {}> {
      const expandProps = parseExpand(expand);

      return this.locationService.getLocation(id, expandProps);
    }

    @httpPost(
      '/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: LocationUpdateValidator
      }))
    )
    private async updatePartialLocation(@request() req: Request, @requestParam('id') id: string, @requestBody() locationUpdate: LocationUpdate): Promise<Location> {

      return this.locationService.updatePartialLocation(id, locationUpdate);
    }

    @httpDelete(
      '/:id',
      authWithId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    @deleteMethod
    private async removeLocation(@requestParam('id') id: string): Promise<void> {
      return this.locationService.removeLocation(id);
    }

    @httpPut(
      '/:locationId/user-roles/:userId',
      authWithLocationId,
      reqValidator.create(t.type({
        params: t.type({
          locationId: t.string,
          userId: t.string
        }),
        body: t.strict({
          roles: NonEmptyArray(t.string)
        })
      }))
    )
    @createMethod
    private async addLocationUserRole(@requestParam('locationId') locationId: string, @requestParam('userId') userId: string, @requestBody() { roles }: Pick<LocationUserRole, 'roles'>): Promise<LocationUserRole> {
      return this.locationService.addLocationUserRole(locationId, userId, roles);
    }

    @httpDelete(
      '/:locationId/user-roles/:userId',
      authWithLocationId,
      reqValidator.create(t.type({
        params: t.type({
          locationId: t.string,
          userId: t.string
        })
      }))
    )
    @deleteMethod
    private async removeLocationUserRole(@requestParam('locationId') locationId: string, @requestParam('userId') userId: string): Promise<void> {
      return this.locationService.removeLocationUserRole(locationId, userId);
    }

    @httpPost(
      '/:id/systemMode',
      authWithLocationId,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: SystemModeRequestCodec
      }))
    )
    private async setSystemMode(@request() req: Request, @requestParam('id') id: string, @requestBody() data: SystemModeRequest): Promise<void> {
      const deviceSystemModeService = this.deviceSystemModeServiceFactory.create(req);

      return this.locationService.setSystemMode(id, deviceSystemModeService, data);
    }
  }

  return LocationControllerFactory;
}