import express from 'express';
import * as Either from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpGet, httpPost, interfaces, request, requestBody, requestParam, response, httpDelete, queryParam, httpPut } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import { $enum } from 'ts-enum-util';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { AlarmEvent, AlarmSeverityCodec, AlertReportDefinition, AlertReportDefinitionCodec, AlertStatus, AlertStatusCodec, ClearAlertBody, ClearAlertBodyCodec, ClearAlertResponse, IncidentStatusReasonCodec, NotificationStatistics, PaginatedResult, UserFeedback, UserFeedbackCodec, FilterState, FilterStateCodec, NewUserFeedbackRequest, NewUserFeedbackRequestCodec, UnitSystem } from '../api';
import { httpController, deleteMethod } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';
import { AlertService, UserService } from '../service';
import UnauthorizedError from '../api/error/UnauthorizedError';

export function AlertControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const authWithIcdIdOrLocationId = authMiddlewareFactory.create(
    async ({ body: { deviceId, locationId } }: Request) => ({
      icd_id: deviceId, location_id: locationId
    })
  );

  type Integer = t.TypeOf<typeof t.Integer>;

  const IntegerFromString = new t.Type<Integer, string, unknown>(
    'IntegerFromString',
    (u): u is Integer => t.Integer.is(u),
    (u, c) => {
      return Either.either.chain(t.string.validate(u, c), str => {
        const value = parseInt(str, 10);

        return isNaN(value) ? t.failure(str, c) : t.success(value);
      });
    },
    a => `${ a }`
  );

  type BooleanType = t.TypeOf<typeof t.boolean>;

  const BooleanFromString = new t.Type<BooleanType, string, unknown>(
    'BooleanFromString',
    (u): u is BooleanType => t.boolean.is(u),
    (u, c) => {
      return Either.either.chain(t.string.validate(u, c), str => {
        return !str ? t.failure(str, c) : t.success(str === 'true');
      });
    },
    a => `${ a }`
  );

  @httpController({ version: apiVersion }, '/alerts')
  class AlertController extends BaseHttpController {
    constructor(
      @inject('NotificationServiceFactory') private notificationServiceFactory: NotificationServiceFactory,
      @inject('AlertService') private alertService: AlertService,
      @inject('UserService') private userService: UserService
    ) {
      super();
    }

    @httpGet('/statistics')
    private async retrieveStatistics(@request() req: Request): Promise<NotificationStatistics> {
      const filters = req.url.split('?')[1] || '';

      return this
        .notificationServiceFactory
        .create(req)
        .retrieveStatistics(filters);
    }

    @httpGet('/',
      authMiddlewareFactory.create(),
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
          isInternalAlarm: BooleanFromString,
          page: IntegerFromString,
          size: IntegerFromString,
          lang: t.string,
          unitSystem: t.string
        })
      }))
    )
    private async getAlarmEventsByFilter(@request() req: Request): Promise<PaginatedResult<AlarmEvent>> {
      const defaultLang = 'en-us';
      const tokenUserId = req.token && req.token.user_id;

      const noLocationOrDevice = !req.query.locationId && !req.query.deviceId;
      const userId = req.query.userId || (tokenUserId && (!req.query.lang || noLocationOrDevice) ? tokenUserId : undefined);
      
      const retrieveUser = async (id: string, expandLocations: boolean) => {
        const propExpand = expandLocations ? 
        { 
          $select: { 
            locations: { 
              $expand: true   
            } 
          } 
        } 
        : undefined;
        return this.userService.getUserById(id,  propExpand);
      };

      const convertUnitSystem = (unitSystem?: UnitSystem) => unitSystem === UnitSystem.METRIC_KPA ? 'metric' : 'imperial';
      
      const user = userId ? O.toUndefined(await retrieveUser(userId, (req.query.userId || noLocationOrDevice))) : undefined;

      const lang = { 
        lang: (req.query.lang ? 
          req.query.lang :
            userId === tokenUserId ? 
              user?.locale || defaultLang :
              O.toUndefined(await retrieveUser(tokenUserId, false))?.locale || defaultLang)
      };

      const unitSystem = { 
        unitSystem: (req.query.unitSystem ? 
          req.query.unitSystem :
            userId === tokenUserId ? 
              convertUnitSystem(user?.unitSystem) :
              convertUnitSystem(O.toUndefined(await retrieveUser(tokenUserId, false))?.unitSystem))
      };
        
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

      const filters = {
        ...req.query,
        ...lang,
        ...unitSystem,
        ...(!_.isEmpty(deviceIds) && { deviceId: deviceIds }),
        ...(!_.isEmpty(locationId) && { locationId }),
        ...(!_.isEmpty(status) && { status }),
        ...(!_.isEmpty(severity) && { severity }),
        ...(!_.isEmpty(reason) && { reason })
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

      return this.alertService.getAlarmEventsByFilter(filters);
    }

    @httpPost('/action',
      authWithIcdIdOrLocationId,
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

      const service = this.notificationServiceFactory.create(req);

      const clearResponse = await service.clearAlarms(data.alarmIds, {
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
      const alarmEvent = await this.notificationServiceFactory.create(req).getAlarmEvent(incidentId);

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
      return this.notificationServiceFactory.create(req).getFilterStateById(filterStateId);
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
      return this.notificationServiceFactory.create(req).getFilterState(req.query);
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
      return this.notificationServiceFactory.create(req).deleteFilterState(filterStateId);
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
      return this.notificationServiceFactory.create(req).createFilterState(filterState);
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
