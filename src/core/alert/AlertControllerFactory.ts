import express from 'express';
import * as O from 'fp-ts/lib/Option';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpGet, httpPost, interfaces, request, requestBody, requestParam, response, httpDelete, queryParam, httpPut } from 'inversify-express-utils';
import * as t from 'io-ts';
import * as _ from 'lodash';
import { $enum } from 'ts-enum-util';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { DependencyFactoryFactory, AlarmEvent, AlarmSeverityCodec, AlertReportDefinition, AlertReportDefinitionCodec, AlertStatus, AlertStatusCodec, ClearAlertBody, ClearAlertBodyCodec, ClearAlertResponse, IncidentStatusReasonCodec, NotificationStatistics, PaginatedResult, UserFeedback, UserFeedbackCodec, FilterState, FilterStateCodec, NewUserFeedbackRequest, NewUserFeedbackRequestCodec, UnitSystem, PropExpand, AlarmEventFilter } from '../api';
import { httpController, deleteMethod } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationService } from '../notification/NotificationService';
import { AlertService, UserService, LocationService, DeviceService } from '../service';
import UnauthorizedError from '../api/error/UnauthorizedError';
import { BooleanFromString } from '../api/validator/BooleanFromString';
import { PositiveIntegerFromString } from '../api/validator/PositiveIntegerFromString';
import { convertToLocalTimeWithOffset } from '../api/dateUtils';

export function AlertControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');

  const authWithIcdIdOrLocationIdOrParents = authMiddlewareFactory.create(async ({ body: { deviceId, locationId } }: Request, depFactoryFactory: DependencyFactoryFactory) => {
    const locationService = depFactoryFactory<LocationService>('LocationService')();
    const deviceService = deviceId && depFactoryFactory<DeviceService>('DeviceService')();
    const device = deviceId && O.toNullable((await deviceService.getDeviceById(deviceId, { $select: { location: { $select: { id: true } } } })));
    const parentIds = locationId ? 
      (await locationService.getAllParentIds(locationId)) :
      device ?
        (await locationService.getAllParentIds(device.location.id)) :
        [];

    return {
      location_id: locationId ? [locationId, ...parentIds] : parentIds,
      icd_id: deviceId
    };
  });

  @httpController({ version: apiVersion }, '/alerts')
  class AlertController extends BaseHttpController {
    constructor(
      @inject('NotificationService') private notificationService: NotificationService,
      @inject('AlertService') private alertService: AlertService,
      @inject('UserService') private userService: UserService
    ) {
      super();
    }

    @httpGet('/statistics')
    private async retrieveStatistics(@request() req: Request): Promise<NotificationStatistics> {
      const filters = req.url.split('?')[1] || '';

      return this
        .notificationService
        .retrieveStatistics(filters);
    }

    @httpGet('/',
      reqValidator.create(t.type({
        query: t.partial({
          userId: t.string,
          locationId: t.union([t.string, t.array(t.string)]),
          deviceId: t.union([t.string, t.array(t.string)]),
          accountId: t.string,
          groupId: t.string,
          status: t.union([t.string, t.array(AlertStatusCodec)]),
          severity: t.union([t.string, t.array(AlarmSeverityCodec)]),
          reason: t.union([t.string, t.array(IncidentStatusReasonCodec)]),
          alarmId: t.union([PositiveIntegerFromString, t.array(PositiveIntegerFromString)]),
          isInternalAlarm: BooleanFromString,
          page: PositiveIntegerFromString,
          size: PositiveIntegerFromString,
          lang: t.string,
          unitSystem: t.string,
          createdAt: t.union([t.string, t.array(t.string)])
        })
      })),
      authMiddlewareFactory.create(async ({ query }: Request, depFactoryFactory: DependencyFactoryFactory) => {
        const {
          userId,
          locationId,
          deviceId,
          accountId,
          groupId
        } = query;

        if (!deviceId) {
          return [];
        }

        const locationService = depFactoryFactory<LocationService>('LocationService')();
        const deviceService = depFactoryFactory<DeviceService>('DeviceService')();

        const devices = !_.isEmpty(deviceId) && (await Promise.all((_.isArray(deviceId) ? deviceId : [deviceId])
          .map(async (did) => 
            O.toNullable((await deviceService.getDeviceById(did?.toString(), { $select: { location: { $select: { id: true } } } })))
          )));
        const deviceParents = devices && !_.isEmpty(devices) && (await Promise.all(
          devices
            .filter(device => device)
            .map(async device => [
              ...(device ? [device.location.id] : []),
              ...(device ? (await locationService.getAllParentIds(device.location.id)) : [])
            ])
        ));
        const locationsAndParents = !_.isEmpty(locationId) && (await Promise.all((_.isArray(locationId) ? locationId : [locationId])
          .map(async (locId) => [
            locId,
            ...(await locationService.getAllParentIds(locId?.toString() || ''))
          ])
        ));

        return [
          ...(userId ? [{ user_id: userId }] : []),
          ...(accountId ? [{ account_id: accountId }] : []),
          ...(groupId ? [{ group_id: groupId }] : []),
          ...(devices && !_.isEmpty(devices) ? devices.filter(device => device).map(device => ({ icd_id: device?.id })) : []),
          ...((deviceParents && !_.isEmpty(deviceParents)) ? deviceParents.map(dp => ({ location_id: dp })) : []),
          ...((locationsAndParents && !_.isEmpty(locationsAndParents)) ? locationsAndParents.map(lp => ({ location_id: lp })) : [])
        ]; 
      }),

    )
    private async getAlarmEventsByFilter(@request() req: Request): Promise<PaginatedResult<AlarmEvent>> {

      const defaultLang = 'en-us';
      const tokenUserId = req.token && req.token.user_id;

      const noLocationOrDevice = !req.query.locationId && !req.query.deviceId;
      const userId = req.query.userId || (tokenUserId && (!req.query.lang || noLocationOrDevice) ? tokenUserId : undefined);
      
      const retrieveUser = async (id: string, expandLocations: boolean) => {
        const propExpand: PropExpand = { 
          $select: { 
            locale: true,
            unitSystem: true,
            ...(expandLocations ? 
              { 
                locations: { 
                  $select: {
                    id: true,
                    devices: {
                      $select: {
                        id: true
                      }
                    }
                  } 
                } 
              } : 
              {})
          } 
        };
        return this.userService.getUserById(id,  propExpand);
      };

      const convertUnitSystem = (unitSystem?: UnitSystem) => unitSystem === UnitSystem.METRIC_KPA ? 'metric' : 'imperial';
      
      const user = userId ? O.toUndefined(await retrieveUser(userId, (Boolean(req.query.userId?.toString()) || noLocationOrDevice))) : undefined;

      const lang = req.query.lang ? req.query.lang : (user?.locale || defaultLang);
      const unitSystem = req.query.unitSystem ? req.query.unitSystem : convertUnitSystem(user?.unitSystem);
        
      const queryDeviceIds = req.query.deviceId ?
        _.concat([], req.query.deviceId)
        : [];

      const userDeviceIds = user ?
        _.flatMap(user.locations, l => l.devices ? l.devices.map(d => d.id) : [])
        : [];

      const deviceIds = _.concat(queryDeviceIds, userDeviceIds);
      const locationId = _.concat([], req.query.locationId || []);
      const status = _.concat([], req.query.status || $enum(AlertStatus).getValues());
      const severity = _.concat([], req.query.severity || []);
      const reason = _.concat([], req.query.reason || []);
      const alarmId = _.concat([], req.query.alarmId || []);
      const createdAt = _.concat([], req.query.createdAt || []);

      const filters = {
        ...req.query,
        lang,
        unitSystem,
        ...(!_.isEmpty(deviceIds) && { deviceId: deviceIds }),
        ...(!_.isEmpty(locationId) && { locationId }),
        ...(!_.isEmpty(status) && { status }),
        ...(!_.isEmpty(severity) && { severity }),
        ...(!_.isEmpty(reason) && { reason }),
        ...(!_.isEmpty(alarmId) && { alarmId }),
        ...(!_.isEmpty(createdAt) && { createdAt }),
      };

      if (_.isEmpty(filters.deviceId) && _.isEmpty(filters.locationId) && noLocationOrDevice) {
        // User ID has no device or locations associated.
        return Promise.resolve({
          items: [],
          total: 0,
          page: 0,
          pageSize: 0
        });
      }

      const alarmEvents = await this.alertService.getAlarmEventsByFilter(filters as AlarmEventFilter, {
        $select: {
          id: true,
          nickname: true,
          address: true,
          address2: true,
          city: true,
          state: true,
          country: true,
          postalCode: true,
          timezone: true,
          userRoles: true,
          geoLocation: true,
        }
      });

      return {
        ...alarmEvents,
        items: alarmEvents.items.map((alarmEvent) => ({
          ...alarmEvent,
          ...alarmEvent.createAt && { createAt: convertToLocalTimeWithOffset(alarmEvent.createAt, alarmEvent.location?.timezone) },
          ...alarmEvent.updateAt && { updateAt: convertToLocalTimeWithOffset(alarmEvent.updateAt, alarmEvent.location?.timezone) },
          ...alarmEvent.resolutionDate && { resolutionDate: convertToLocalTimeWithOffset(alarmEvent.resolutionDate, alarmEvent.location?.timezone) }
        }))
      };
    }

    @httpPost('/action',
      authWithIcdIdOrLocationIdOrParents,
      reqValidator.create(t.type({
        body: ClearAlertBodyCodec
      }))
    )
    private async clearAlarms(@request() req: Request, @requestBody() data: ClearAlertBody): Promise<ClearAlertResponse> {
      const hasDeviceId = (obj: any): obj is { deviceId: string } => {
        return obj.deviceId !== undefined;
      };
      const hasLocationId = (obj: any): obj is { locationId: string } => {
        return obj.locationId !== undefined;
      };

      const clearResponse = await this.notificationService.clearAlarms(data.alarmIds, {
        ...(hasDeviceId(data) && { deviceId: data.deviceId }),
        ...(hasLocationId(data) && { locationId: data.locationId }),
        snoozeSeconds: data.snoozeSeconds
      });

      return {
        cleared: clearResponse.cleared
      };
    }

    @httpPost('/:id/userFeedback',
      // Auth deferred to controller method
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
        }),
        body: t.type({
          feedback: UserFeedbackCodec.props.feedback
        })
      }))
    )
    private async submitIncidentFeedback(@request() req: Request, @response() res: express.Response, @requestParam('id') incidentId: string, @requestBody() userFeedback: UserFeedback & { deviceId: string, alarmId: number | undefined, systemMode: string | undefined }): Promise<UserFeedback> {
      const alarmEvent = await this.notificationService.getAlarmEvent(incidentId);

      await authMiddlewareFactory.create(async () => ({ icd_id: alarmEvent.deviceId }))(req, res, err => {
        if (err) {
          throw err;
        }
      });

      const tokenMetadata = req.token;

      return this.alertService.submitFeedback(alarmEvent, userFeedback, tokenMetadata && tokenMetadata.user_id);
    }

    @httpGet('/filters/:id',
      authMiddlewareFactory.create(),
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
        })
      }))
    )
    private async getFilterStateById(@request() req: Request, @requestParam('id') filterStateId: string): Promise<O.Option<FilterState>> {
      return this.notificationService.getFilterStateById(filterStateId);
    }

    @httpGet('/filters',
      authMiddlewareFactory.create(),
      reqValidator.create(t.type({
        query: t.type({
          deviceId: t.string,
        })
      }))
    )
    private async getFilterState(@request() req: Request): Promise<FilterState[]> {
      return this.notificationService.getFilterState(req.query);
    }

    @httpDelete('/filters/:id',
      authMiddlewareFactory.create(),
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
        })
      }))
    )
    @deleteMethod
    private async deleteFilterState(@request() req: Request, @requestParam('id') filterStateId: string): Promise<void> {
      return this.notificationService.deleteFilterState(filterStateId);
    }

    @httpPost('/filters',
      authMiddlewareFactory.create(),
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
        }),
        body: FilterStateCodec
      }))
    )
    private async createFilterState(@request() req: Request, @requestBody() filterState: FilterState): Promise<FilterState> {
      return this.notificationService.createFilterState(filterState);
    }

    @httpGet('/:id',
      authMiddlewareFactory.create(),
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          lang: t.string,
          unitSystem: t.string
        })
      }))
    )
    private async getAlarmEvent(@requestParam('id') id: string, @queryParam('lang') lang?: string, @queryParam('unitSystem') unitSystem?: string): Promise<AlarmEvent> {
      return this.alertService.getAlarmEvent(id, lang, unitSystem);
    }

    @httpPut('/:id/feedback',
      authMiddlewareFactory.create(),
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          force: BooleanFromString
        }),
        body: NewUserFeedbackRequestCodec
      }))
    )
    private async saveUserFeedback(@request() req: Request, @requestParam('id') id: string, @requestBody() userFeedbackBody: NewUserFeedbackRequest, @queryParam('force') force?: boolean): Promise<void> {
      const userId = req.token && req.token.user_id;
      
      if (!userId) {
        throw new UnauthorizedError();
      }

      const userFeedback = {
        ...userFeedbackBody,
        userId
      };

      return this.alertService.saveUserFeedback(id, userFeedback, force);
    }

    @httpPost('/report',
      authMiddlewareFactory.create(),
      reqValidator.create(t.type({
        body: AlertReportDefinitionCodec
      }))
    )
    private async buildAlertReport(@requestBody() alertReportDefinition: AlertReportDefinition): Promise<PaginatedResult<AlarmEvent>> {
      return this.alertService.buildAlertReport(alertReportDefinition);
    }
  }

  return AlertController;
}
