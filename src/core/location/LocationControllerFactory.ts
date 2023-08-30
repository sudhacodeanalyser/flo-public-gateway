import * as O from 'fp-ts/lib/Option';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, httpPut, interfaces, queryParam, request, requestBody, requestParam, all } from 'inversify-express-utils';
import * as t from 'io-ts';
import * as _ from 'lodash';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { LocationFacetPage, DependencyFactoryFactory, AreaName, AreaNameCodec, Areas, Location, LocationCreateValidator, LocationUpdate, LocationUpdateValidator, LocationUserRole, SystemMode, SystemModeCodec, PesThresholdsCodec, PesThresholds, LocationPage, LocationSortProperties } from '../api';
import { createMethod, deleteMethod, httpController, parseExpand, withResponseType, httpMethod, queryParamArray, asyncMethod } from '../api/controllerUtils';
import Request, { extractIpAddress } from '../api/Request';
import * as Responses from '../api/response';
import { NonEmptyArray } from '../api/validator/NonEmptyArray';
import { DeviceSystemModeServiceFactory } from '../device/DeviceSystemModeService';
import { LocationService } from '../service';
import { either } from 'fp-ts/lib/Either';
import { IntegerFromString } from '../api/validator/IntegerFromString';
import { BooleanFromString } from '../api/validator/BooleanFromString';
import ReqValidationError from '../../validation/ReqValidationError';
import { getEventInfo } from '../api/eventInfo';

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

  const FalseFromString = new t.Type<false, string, unknown>(
    'FalseFromString',
    (u): u is false => t.literal(false).is(u),
    (u, c) => {
      return either.chain(t.string.validate(u, c), str => {
        const s = str.toLowerCase();
        return s !== 'false' ? t.failure(str, c) : t.success(false);
      });
    },
    a => `${ a }`
  );

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
      const resourceEventInfo = getEventInfo(req);      

      return this.locationService.createLocation(resourceEventInfo, location, userId, roles);
    }

    @httpMethod(
      'get',
      '/',
      authMiddlewareFactory.create(async ({ query: { userId } }) => ({ user_id: userId })),
       reqValidator.create(t.type({
         query: t.intersection([
           t.partial({
             userId: t.string,
             class: t.union([t.array(t.string), t.string]),
             city: t.union([t.array(t.string), t.string]),
             state: t.union([t.array(t.string), t.string]),
             country: t.union([t.array(t.string), t.string]),
             postalCode: t.union([t.array(t.string), t.string]),
             parentId: t.string,
             expand: t.string,
             size: IntegerFromString,
             page: IntegerFromString,
             q: t.string,
             sort: t.string,
             hasOfflineDevices: BooleanFromString,
           }),
           t.union([
             t.type({
               withChildren: t.union([t.undefined, FalseFromString]),
               rootOnly: t.union([t.undefined, FalseFromString])
             }),
             t.type({
               withChildren: BooleanFromString,
               rootOnly: t.union([t.undefined, FalseFromString])
             }),
             t.type({
               withChildren: t.union([t.undefined, FalseFromString]),
               rootOnly: BooleanFromString
             })
           ])
         ])
       }))
    )
    private async getLocations(
      @request() req: Request,
      @queryParam('userId') userId?: string,
      @queryParamArray('class') locClass?: string[], 
      @queryParamArray('city') city?: string[],
      @queryParamArray('state') state?: string[],
      @queryParamArray('country') country?: string[],
      @queryParamArray('postalCode') postalCode?: string[],
      @queryParam('expand') expand?: string,
      @queryParam('parentId') parentId?: string,
      @queryParam('size') size?: number,
      @queryParam('page') page?: number,
      @queryParam('withChildren') withChildren: boolean = true,
      @queryParam('rootOnly') rootOnly: boolean = false,
      @queryParam('q') searchText?: string,
      @queryParam('sort') sort?: string,
      @queryParam('hasOfflineDevices') hasOfflineDevices?: boolean
    ): Promise<{ total: number; page: number; items: Responses.Location[] }> {
      const tokenMetadata = req.token;
      const expandProps = parseExpand(expand);
      const filters = {
        locClass,
        city,
        state,
        country,
        postalCode,
        parentId,
        hasOfflineDevices,
      };
      let locPage: LocationPage;
      let sortProperties: LocationSortProperties | undefined;
      if (tokenMetadata === undefined) {
        throw new Error('No token defined.');
      }
      if (!userId && !tokenMetadata.isAdmin()) {
        throw new ReqValidationError('User id should be provided')
      }

      if (sort) {
        sortProperties = sort.split(',').reduce((sortMap, key) => {
          return {
            ...sortMap,
            [key]: true
          }
        }, {});
      }

      if (withChildren && !rootOnly && userId) {
        locPage = await this.locationService.getByUserIdWithChildren(userId, expandProps, size, page, filters, searchText, sortProperties);
      } else if (rootOnly && userId) {
        locPage = await this.locationService.getByUserIdRootOnly(userId, expandProps, size, page, filters, searchText, sortProperties);
      } else if (userId) {
        locPage = await this.locationService.getByUserId(userId, expandProps, size, page, filters, searchText, sortProperties);
      } else {
        locPage = await this.locationService.getAllByFilters(expandProps, size, page, filters, searchText, sortProperties);
      }

      return {
        ...locPage,
        items: locPage.items.map(loc => Responses.Location.fromModel(loc))
      };
    }

    @httpMethod(
      'get',
      '/facets',
      authMiddlewareFactory.create(async ({ query: { userId } }) => ({ user_id: userId })),
      reqValidator.create(t.type({
        query: t.intersection([
          t.type({
            userId: t.string,
            name: t.union([t.string, t.array(t.string)])
          }),
          t.partial({
            size: IntegerFromString,
            page: IntegerFromString,
            contains: t.string
          })
        ])
      }))
    )
    private async getFacets(
      @queryParam('userId') userId: string,
      @queryParamArray('name') facetNames: string[],
      @queryParam('size') size?: number,
      @queryParam('page') page?: number,
      @queryParam('contains') contains?: string
    ): Promise<LocationFacetPage> {
      return this.locationService.getFacetsByUserId(userId, facetNames, size, page, contains);
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
      })),
      authWithParents
    )
    @withResponseType<Location, Responses.Location>(Responses.Location.fromModel)
    private async getLocation(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<Option<Location>> {
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
      })),
      authWithParents
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
    private async removeLocation(@request() req: Request, @requestParam('id') id: string): Promise<void> {
      const resourceEventInfo = getEventInfo(req);
      return this.locationService.removeLocation(id, resourceEventInfo);
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
      })),
      authWithParents
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
      })),
      authWithParents
    )
    @deleteMethod
    private async removeLocationUserRole(@requestParam('locationId') locationId: string, @requestParam('userId') userId: string): Promise<void> {
      return this.locationService.removeLocationUserRole(locationId, userId);
    }

    @httpPost(
      '/:id/systemMode',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: SystemModeRequestCodec
      })),
      authWithParents
    )
    private async setSystemMode(@request() req: Request, @requestParam('id') id: string, @requestBody() data: SystemModeRequest): Promise<void> {
      const deviceSystemModeService = this.deviceSystemModeServiceFactory.create(req);

      return this.locationService.setSystemMode(id, deviceSystemModeService, data);
    }

    @httpPost(
      '/:locationId/areas',
      reqValidator.create(t.type({
        params: t.type({
          locationId: t.string
        }),
        body: AreaNameCodec
      })),
      authWithParents
    )
    @createMethod
    private async addArea(@requestParam('locationId') locationId: string, @requestBody() { name }: AreaName): Promise<Areas> {
      return this.locationService.addArea(locationId, name);
    }

    @httpPost(
      '/:locationId/areas/:areaId',
      reqValidator.create(t.type({
        params: t.type({
          locationId: t.string,
          areaId: t.string
        }),
        body: AreaNameCodec
      })),
      authWithParents
    )
    private async renameArea(@requestParam('locationId') locationId: string, @requestParam('areaId') areaId: string, @requestBody() { name }: AreaName): Promise<Areas> {
      return this.locationService.renameArea(locationId, areaId, name);
    }

    @httpDelete(
      '/:locationId/areas/:areaId',
      reqValidator.create(t.type({
        params: t.type({
          locationId: t.string,
          areaId: t.string
        })
      })),
      authWithParents
    )
    @deleteMethod
    private async removeArea(@requestParam('locationId') locationId: string, @requestParam('areaId') areaId: string): Promise<Areas> {
      return this.locationService.removeArea(locationId, areaId);
    }

    @httpPost(
      '/:id/floSense',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: PesThresholdsCodec
      })),
      authWithParents
    )
    @asyncMethod
    private async overridePes(@requestParam('id') id: string, @requestBody() pesThresholds: PesThresholds): Promise<void> {
      return this.locationService.updatePes(id, pesThresholds);
    }  
  }

  return LocationControllerFactory;
}