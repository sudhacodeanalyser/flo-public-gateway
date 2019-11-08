import express from 'express';
import * as Either from 'fp-ts/lib/Either';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpGet, httpPost, interfaces, request, requestBody, requestParam, response } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import { $enum } from 'ts-enum-util';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { AlarmEvent, AlarmSeverityCodec, AlertStatus, AlertStatusCodec, ClearAlertBody, ClearAlertBodyCodec, ClearAlertResponse, IncidentStatusReasonCodec, NotificationStatistics, PaginatedResult, UserFeedback, UserFeedbackCodec } from '../api';
import { httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';
import { AlertService } from '../service';

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
      @inject('AlertService') private alertService: AlertService
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

    @httpGet('/',
      authMiddlewareFactory.create(),
      reqValidator.create(t.type({
        query: t.intersection([
          t.union([
            // Just locationId
            t.type({
              locationId: t.union([t.string, t.array(t.string)])
            }),
            // Just deviceId
            t.type({
              deviceId: t.union([t.string, t.array(t.string)])
            }),
            // Both together
            t.type({
              locationId: t.union([t.string, t.array(t.string)]),
              deviceId: t.union([t.string, t.array(t.string)])
            })
          ]),
          t.partial({
            accountId: t.string,
            groupId: t.string,
            status: t.union([t.string, t.array(AlertStatusCodec)]),
            severity: t.union([t.string, t.array(AlarmSeverityCodec)]),
            reason: t.union([t.string, t.array(IncidentStatusReasonCodec)]),
            isInternalAlarm: BooleanFromString,
            page: IntegerFromString,
            size: IntegerFromString
          })
        ])
      }))
    )
    private async getAlarmEventsByFilter(@request() req: Request): Promise<PaginatedResult<AlarmEvent>> {
      const filters = req.url.split('?')[1] || '';

      const combinedFilters = [
        filters,
        ...(
          _.isEmpty(req.query.status) ?
            $enum(AlertStatus).getValues().map(status => `status=${status}`) :
            []
        )
      ].join('&');

      return this.alertService.getAlarmEventsByFilter(combinedFilters);
    }

    @httpPost('/action',
      authWithIcdIdOrLocationId,
      reqValidator.create(t.type({
        body: ClearAlertBodyCodec
      }))
    )
    private async clearAlarm(@request() req: Request, @requestBody() data: ClearAlertBody): Promise<ClearAlertResponse> {
      const hasDeviceId = (obj: any): obj is { deviceId: string } => {
        return obj.deviceId !== undefined;
      };
      const hasLocationId = (obj: any): obj is { locationId: string } => {
        return obj.locationId !== undefined;
      };

      const service = this.notificationServiceFactory.create(req);

      const clearResponses = await Promise.all(data.alarmIds.map(alarmId => service.clearAlarm(alarmId, {
        ...(hasDeviceId(data) && { deviceId: data.deviceId }),
        ...(hasLocationId(data) && { locationId: data.locationId }),
        snoozeSeconds: data.snoozeSeconds
      })));

      return clearResponses.reduce((acc, clearResponse) => ({
        cleared: acc.cleared + clearResponse.cleared
      }));
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
  }

  return AlertController;
}
