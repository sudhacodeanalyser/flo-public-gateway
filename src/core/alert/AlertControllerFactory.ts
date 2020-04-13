import express from 'express';
import * as Either from 'fp-ts/lib/Either';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpGet, httpPost, interfaces, request, requestBody, requestParam, response, httpDelete } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import { $enum } from 'ts-enum-util';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { AlarmEvent, AlarmSeverityCodec, AlertStatus, AlertStatusCodec, ClearAlertBody, ClearAlertBodyCodec, ClearAlertResponse, IncidentStatusReasonCodec, NotificationStatistics, PaginatedResult, UserFeedback, UserFeedbackCodec, FilterState, FilterStateCodec, User } from '../api';
import { httpController, deleteMethod } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';
import { AlertService, UserService } from '../service';

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
          lang: t.string
        })
      }))
    )
    private async getAlarmEventsByFilter(@request() req: Request): Promise<PaginatedResult<AlarmEvent>> {
      const defaultLang = 'en-us';
      const tokenUserId = req.token && req.token.user_id;

      const noLocationOrDevice = !req.query.locationId && !req.query.deviceId;
      const maybeUserId = req.query.userId || (tokenUserId && (req.query.lang || noLocationOrDevice) ? tokenUserId : undefined);
      const maybeUser = await pipe(
        O.fromNullable(maybeUserId),
        O.map(async userId => this.userService.getUserById(userId, (req.query.userId || noLocationOrDevice) ? { $select: { locations: { $expand: true } } } : undefined )),
        O.getOrElse(async (): Promise<O.Option<User>> => O.none)
      )      
      const lang = { 
        lang: (req.query.lang ? 
          req.query.lang :         
            `${tokenUserId ? (pipe(
              maybeUser,
              O.fold(
                (): string => defaultLang,
                user => user.locale || defaultLang
              )
            )) 
          : defaultLang}`) 
      };
        
      const queryDeviceIds = req.query.deviceId ?
        _.concat([], req.query.deviceId)
        : [];

      const userDeviceIds = pipe(
        maybeUser,
        O.fold(
          (): string[] => [],
          user => _.flatMap(user.locations, l => l.devices ? l.devices.map(d => d.id) : [])
        )
      );

      const filters = {
        ...req.query,
        ...(_.isEmpty(req.query.status) && { status: $enum(AlertStatus).getValues() }),
        ...lang,
        deviceId: _.concat(queryDeviceIds, userDeviceIds)
      }         

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
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async getAlarmEvent(@requestParam('id') id: string): Promise<AlarmEvent> {
      return this.alertService.getAlarmEvent(id);
    }
  }

  return AlertController;
}
