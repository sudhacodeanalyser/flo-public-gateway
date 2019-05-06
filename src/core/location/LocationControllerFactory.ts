import _ from 'lodash';
import express from 'express';
import { interfaces, httpGet, httpPost, httpDelete, httpPut, queryParam, requestParam, requestBody, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { Location, LocationUpdateValidator, LocationUpdate, LocationUserRole, LocationCreateValidator } from '../api/api';
import LocationService from './LocationService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import { parseExpand, httpController, createMethod, deleteMethod } from '../api/controllerUtils';
import { NonEmptyArray } from '../api/validator/NonEmptyArray';



export function LocationControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @httpController({ version: apiVersion }, '/locations')
  class LocationController extends BaseHttpController {
    constructor(
      @inject('LocationService') private locationService: LocationService
    ) {
      super();
    }

    @httpPost(
      '/',
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
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: LocationUpdateValidator
      }))
    )
    private async updatePartialLocation(@requestParam('id') id: string, @requestBody() locationUpdate: LocationUpdate): Promise<Location> {
      return this.locationService.updatePartialLocation(id, locationUpdate);
    }

    @httpDelete(
      '/:id',
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
  }

  return LocationControllerFactory;
}