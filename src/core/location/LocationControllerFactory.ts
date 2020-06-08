import * as O from 'fp-ts/lib/Option';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, httpPut, interfaces, queryParam, request, requestBody, requestParam, all } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { DependencyFactoryFactory, AreaName, AreaNameCodec, Areas, Location, LocationCreateValidator, LocationUpdate, LocationUpdateValidator, LocationUserRole, SystemMode, SystemModeCodec, PesThresholdsCodec, PesThresholds } from '../api';
import { createMethod, deleteMethod, httpController, parseExpand, withResponseType, httpMethod, queryParamArray, asyncMethod } from '../api/controllerUtils';
import Request from '../api/Request';
import * as Responses from '../api/response';
import { NonEmptyArray } from '../api/validator/NonEmptyArray';
import { DeviceSystemModeServiceFactory } from '../device/DeviceSystemModeService';
import { LocationService } from '../service';
import { either } from 'fp-ts/lib/Either';

const { some } = O;
type Option<T> = O.Option<T>;

export function LocationControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithId = authMiddlewareFactory.create(async ({ params: { id } }: Request) => ({ location_id: id }));

  const authWithParents = authMiddlewareFactory.create(async ({ params: { id, locationId } }: Request, depFactoryFactory: DependencyFactoryFactory) => {
    const locId = id || locationId;
    const locationService = depFactoryFactory<LocationService>('LocationService')();
    const parentIds = await locationService.getAllParentIds(locId);

    return {
      location_id: [locId, ...parentIds]
    };
  });

  type Integer = t.TypeOf<typeof t.Integer>;

  const IntegerFromString = new t.Type<Integer, string, unknown>(
    'IntegerFromString',
    (u): u is Integer => t.Integer.is(u),
    (u, c) => {
      return either.chain(t.string.validate(u, c), str => {
        const value = parseInt(str, 10);

        return isNaN(value) ? t.failure(str, c) : t.success(value);
      });
    },
    a => `${ a }`
  ) 

  interface SystemModeRequestBrand {
    readonly SystemModeRequest: unique symbol;
  }

  const UnbrandedSystemModeRequestCodec = t.type({
    target: SystemModeCodec,
    revertMinutes: t.union([t.undefined, t.Int]),
    revertMode: t.union([t.undefined, SystemModeCodec]),
    shouldCascade: t.union([t.undefined, t.boolean])
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
        (revertMinutes !== undefined && revertMode !== undefined && target !== SystemMode.SLEEP) ||
        revertMode === SystemMode.SLEEP
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

    @httpMethod(
      'post',
      '/',
      authMiddlewareFactory.create(
        async ({ body }: Request) => ({ account_id: _.get(body, 'account.id', null) })
      ),
      reqValidator.create(t.type({
        body: LocationCreateValidator,
        query: t.partial({
          roles: t.union([t.array(t.string), t.string])
        })
      }))
    )
    @createMethod
    @withResponseType<Location, Responses.Location>(Responses.Location.fromModel)
    private async createLocation(@request() req: Request, @requestBody() location: Location, @queryParamArray('roles') roles?: string[]): Promise<Option<Location>> {
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;

      return this.locationService.createLocation(location, userId, roles);
    }

    @httpMethod(
      'get',
      '/',
      authMiddlewareFactory.create(async ({ query: { userId } }) => ({ user_id: userId })),
       reqValidator.create(t.type({
         query: t.intersection([
           t.type({
               userId: t.string
           }),
           t.partial({
             class: t.union([t.array(t.string), t.string]),
             expand: t.string,
             size: IntegerFromString,
             page: IntegerFromString
           })
         ])
       }))
    )
    private async getLocations(
      @queryParam('userId') userId: string, 
      @queryParamArray('class') locationClass?: string[], 
      @queryParam('expand') expand?: string,
      @queryParam('size') size?: number,
      @queryParam('page') page?: number
    ): Promise<{ total: number; page: number; items: Responses.Location[] }> {
      const expandProps = parseExpand(expand);
      const locPage = (await (
          locationClass && !_.isEmpty(locationClass) ? 
            this.locationService.getByUserIdAndClassWithChildren(userId, locationClass, expandProps, size, page) :
            this.locationService.getByUserIdWithChildren(userId, expandProps, size, page)
        )
      );

      return {
        ...locPage,
        items: locPage.items.map(loc => Responses.Location.fromModel(loc))
      };
    }

    @httpGet(
      '/:id',
      authWithParents,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    @withResponseType<Location, Responses.Location>(Responses.Location.fromModel)
    private async getLocation(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Option<Location>> {
      const expandProps = parseExpand(expand);

      return this.locationService.getLocation(id, expandProps);
    }

    @httpPost(
      '/:id',
      authWithParents,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: LocationUpdateValidator
      }))
    )
    @withResponseType<Location, Responses.Location>(Responses.Location.fromModel)
    private async updatePartialLocation(@request() req: Request, @requestParam('id') id: string, @requestBody() locationUpdate: LocationUpdate): Promise<Option<Location>> {
      const updatedLocation = await this.locationService.updatePartialLocation(id, locationUpdate);

      return some(updatedLocation);
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
      authWithParents,
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
      authWithParents,
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
      authWithParents,
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

    @httpPost(
      '/:locationId/areas',
      authWithParents,
      reqValidator.create(t.type({
        params: t.type({
          locationId: t.string
        }),
        body: AreaNameCodec
      }))
    )
    @createMethod
    private async addArea(@requestParam('locationId') locationId: string, @requestBody() { name }: AreaName): Promise<Areas> {
      return this.locationService.addArea(locationId, name);
    }

    @httpPost(
      '/:locationId/areas/:areaId',
      authWithParents,
      reqValidator.create(t.type({
        params: t.type({
          locationId: t.string,
          areaId: t.string
        }),
        body: AreaNameCodec
      }))
    )
    private async renameArea(@requestParam('locationId') locationId: string, @requestParam('areaId') areaId: string, @requestBody() { name }: AreaName): Promise<Areas> {
      return this.locationService.renameArea(locationId, areaId, name);
    }

    @httpDelete(
      '/:locationId/areas/:areaId',
      authWithParents,
      reqValidator.create(t.type({
        params: t.type({
          locationId: t.string,
          areaId: t.string
        })
      }))
    )
    @deleteMethod
    private async removeArea(@requestParam('locationId') locationId: string, @requestParam('areaId') areaId: string): Promise<Areas> {
      return this.locationService.removeArea(locationId, areaId);
    }

    @httpPost(
      '/:id/floSense',
      authWithParents,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: PesThresholdsCodec
      }))
    )
    @asyncMethod
    private async overridePes(@requestParam('id') id: string, @requestBody() pesThresholds: PesThresholds): Promise<void> {
      return this.locationService.updatePes(id, pesThresholds);
    }
  }

  return LocationControllerFactory;
}