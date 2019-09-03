import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { Container, inject } from 'inversify';
import { BaseHttpController, httpDelete, httpGet, httpPost, interfaces, request, response, requestBody, requestParam } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationError from '../../validation/ReqValidationError';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { NotificationStatistics, IncidentStatusReasonCodec, AlarmSeverityCodec, ClearAlertResponse, ClearAlertBodyCodec, ClearAlertBody, AlertStatusCodec, AlertStatus, AlarmEvent, AlertFeedback, NotificationCounts, PaginatedResult, UserFeedback, UserFeedbackCodec } from '../api';
import { createMethod, httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { NotificationServiceFactory } from '../notification/NotificationService';
import { AlertService } from '../service';
import { $enum } from 'ts-enum-util';
import express from 'express';

export function AlertControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();
  const authWithIcd = authMiddlewareFactory.create(async ({ body: { deviceId } }) => ({icd_id: deviceId}));

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
            status: t.union([t.string, t.array(AlertStatusCodec)]),
            severity: t.union([t.string, t.array(AlarmSeverityCodec)]),
            reason: t.union([t.string, t.array(IncidentStatusReasonCodec)]),
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
      authWithIcd,
      reqValidator.create(t.type({
        body: ClearAlertBodyCodec
      }))
    )
    private async clearAlarm(@request() req: Request, @requestBody() data: ClearAlertBody): Promise<ClearAlertResponse> {
      const service = this.notificationServiceFactory.create(req);

      const clearResponses = await Promise.all(data.alarmIds.map(alarmId => service.clearAlarm(alarmId, {
        deviceId: data.deviceId,
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