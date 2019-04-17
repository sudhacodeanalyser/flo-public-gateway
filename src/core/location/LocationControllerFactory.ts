import _ from 'lodash';
import * as express from 'express';
import { interfaces, controller, httpGet, httpPost, httpDelete, httpPut, request, queryParam, response, requestParam, requestBody } from 'inversify-express-utils';
import { injectable, inject, Container } from 'inversify';
import { Location, LocationUpdateValidator, LocationUpdate, LocationUser } from '../api/api';
import LocationService from './LocationService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import { parseExpand } from '../api/controllerUtils';

export function LocationControllerFactory(container: Container): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @controller('/locations')
  class LocationController implements interfaces.Controller {
    constructor(
      @inject('LocationService') private locationService: LocationService
    ) {}

    @httpPost(
      '/'
    )
    private createLocation(@requestBody() location: Location): Promise<Location> {
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
    private getLocation(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Location | {}> {
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
    private partiallyUpdateLoation(@requestParam('id') id: string, @requestBody() locationUpdate: LocationUpdate): Promise<Location> {
      return this.locationService.partiallyUpdateLocation(id, locationUpdate);
    }

    @httpDelete(
      '/:id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private removeLocation(@requestParam('id') id: string): Promise<void> {
      return this.locationService.removeLocation(id);
    }

    @httpGet(
      '/:id/users',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    private getAllLocationUsers(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Pick<Location, 'users'>> {
      const expandProps = parseExpand(expand);

      return this.locationService.getAllLocationUsers(id, expandProps);
    }

    @httpPut(
      '/:location_id/users/:user_id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
          user_id: t.string
        }),
        body: t.strict({
          roles: t.array(t.string)
        })
      }))
    )
    private addLocationUser(@requestParam('location_id') locationId: string, @requestParam('user_id') userId: string, @requestBody() { roles }: Pick<LocationUser, 'roles'>): Promise<LocationUser> {
      return this.locationService.addLocationUser(locationId, userId, roles);
    }

    @httpDelete(
      '/:location_id/users/:user_id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
          user_id: t.string
        })
      }))
    )
    private removeLocationUser(@requestParam('location_id') locationId: string, @requestParam('user_id') userId: string): Promise<void> {
      return this.locationService.removeLocationUser(locationId, userId);
    }
  }

  return LocationControllerFactory;
}