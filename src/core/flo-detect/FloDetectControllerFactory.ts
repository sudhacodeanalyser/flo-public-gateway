import { Container, inject } from 'inversify';
import { BaseHttpController, httpPost, interfaces, request, queryParam, requestParam, response, requestBody } from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { FloDetectEventPage, FloDetectComputation, FloDetectLearning, FloDetectCompuationDuration, FloDetectComputationDurationCodec, FloDetectEventFeedbackCodec, FloDetectEvent, FloDetectEventFeedback } from '../api';
import { httpController, httpGet, queryParamArray } from '../api/controllerUtils';
import Request from '../api/Request';
import { FloDetectService, FloDetectResponseEventPage, FloDetectResponseFixtures } from '../service';
import NotFoundError from '../api/error/NotFoundError'
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { either } from 'fp-ts/lib/Either';
import UnauthorizedError from '../api/error/UnauthorizedError';
import ForbiddenError from '../api/error/ForbiddenError';
import express from 'express';

export function FloDetectControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  const DateFromURIEncodedISOString = new t.Type<Date, string, unknown>(
    'DateFromISOString',
    (u): u is Date => u instanceof Date,
    (u, c) => {
      return either.chain(t.string.validate(u, c), str => {
        const decoded = decodeURIComponent(str);
        const date = new Date(decoded);
        return isNaN(date.getTime()) ? t.failure(str, c) : t.success(date);
      });
    },
    a => a.toISOString()
  );

  const DateStringFromURIEncodedString = new t.Type<string, string, unknown>(
    'DateFromISOString',
    (u): u is string => typeof u === 'string',
    (u, c) => {
      return either.chain(t.string.validate(u, c), str => {
        const decoded = decodeURIComponent(str);
        const date = new Date(decoded);
        return isNaN(date.getTime()) ? t.failure(str, c) : t.success(str);
      });
    },
    a => a
  );

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

  @httpController({ version: apiVersion }, '/flodetect')
  class FloDetectController extends BaseHttpController {
    constructor(
      @inject('FloDetectService') private floDetectService: FloDetectService,
    ) {
      super();
    }

    @httpGet('/computations',
      authMiddlewareFactory.create(async ({ query: { macAddress }}) => ({ device_id: macAddress })),
      reqValidator.create(t.type({
        query: t.type({
          macAddress: t.string,
          duration: FloDetectComputationDurationCodec
        })
      }))
    )
    private async getLatestComputation(@queryParam('macAddress') macAddress: string, @queryParam('duration') duration: FloDetectCompuationDuration): Promise<FloDetectComputation | FloDetectLearning> {
      return pipe(
        await this.floDetectService.getLatestComputation(macAddress, duration),
        Option.getOrElse<FloDetectComputation | FloDetectLearning>(() => {
          throw new NotFoundError();
        })
      );
    }

    @httpGet('/computations/:id/events',
      // Auth deferred to controller method
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          start: DateFromURIEncodedISOString,
          size: IntegerFromString,
          order: t.union([t.literal('desc'), t.literal('asc')])
        })
      }))
    )
    private async getEventChronologyPage(
      @request() req: Request, 
      @response() res: express.Response, 
      @requestParam('id') id: string, 
      @queryParam('start') startDate?: Date, 
      @queryParam('size') pageSize?: number, 
      @queryParam('order') order: string = 'asc'
    ): Promise<FloDetectEventPage> {

      if (!req.get('Authorization')) {
        throw new UnauthorizedError();
      }

      const computation = await this.getComputationById(id);

      await this.authorizeByMacAddress(req, res, computation.macAddress);

      const page = await this.floDetectService.getEventChronologyPage(
        computation.macAddress, 
        id, 
        startDate && startDate.toISOString(), 
        !pageSize || pageSize < 0 ? undefined : pageSize, 
        order === 'desc'
      );
   
      return page;
    }
    
    @httpPost('/computations/:id/events/:startDate',
      // Auth deferred to controller method
      reqValidator.create(t.type({
        params: t.type({
          id: t.string,
          startDate: DateFromURIEncodedISOString
        }),
        body: t.type({
          feedback: FloDetectEventFeedbackCodec
        })
      }))
    )
    private async submitEventFeedback(
      @request() req: Request,
      @response() res: express.Response,
      @requestParam('id') id: string,
      @requestParam('startDate') startDate: Date,
      @requestBody() { feedback }: { feedback: FloDetectEventFeedback }
    ): Promise<FloDetectEvent> {

      if (!req.get('Authorization')) {
        throw new UnauthorizedError();
      }

      const computation = await this.getComputationById(id);

      await this.authorizeByMacAddress(req, res, computation.macAddress);

      return this.floDetectService.submitEventFeedback(computation.macAddress, id, startDate.toISOString(), feedback);
    }  

    private async getComputationById(id: string): Promise<FloDetectComputation> {
      return pipe(
        await this.floDetectService.getComputationById(id),
        Option.fold(
          () => { throw new NotFoundError(); },
          computation => computation
        )
      );
    }

    private async authorizeByMacAddress(req: Request, res: express.Response, macAddress: string): Promise<void> {
      await authMiddlewareFactory.create(async () => ({ device_id: macAddress }))(req, res, (err?: any) => {
        if (err) {
          throw err;
        }
      });
    }

    @httpGet('/fixtures',
      authMiddlewareFactory.create(
        async ({ query: { macAddress, locationId } }) => ({ device_id: macAddress, location_id: locationId })
      ),
      reqValidator.create(t.type({
        query: t.intersection([
          t.union([
            t.type({
              macAddress: t.string
            }),
            t.type({
              locationId: t.string
            })
          ]),
          t.partial({
            from: DateStringFromURIEncodedString,
            to: DateStringFromURIEncodedString,
            lang: t.string,
            tz: t.string
          })
        ])
      }))
    )
    private async getFixtures(
      @queryParam('macAddress') macAddress?: string,
      @queryParam('locationId') locationId?: string,
      @queryParam('from') from?: string,
      @queryParam('to') to?: string,
      @queryParam('lang') lang?: string,
      @queryParam('tz') tz?: string
    ): Promise<FloDetectResponseFixtures> {
      return this.floDetectService.getFixtures(
        macAddress ? { macAddress } : { locationId: locationId || '' },
        { from, to, lang, tz }
      );
    }

    @httpGet('/events',
      authMiddlewareFactory.create(
        async ({ query: { macAddress, locationId } }) => ({ device_id: macAddress, location_id: locationId })
      ),
      reqValidator.create(t.type({
        query: t.intersection([
          t.union([
            t.type({
              macAddress: t.string
            }),
            t.type({
              locationId: t.string
            })
          ]),
          t.partial({
            from: DateStringFromURIEncodedString,
            to: DateStringFromURIEncodedString,
            offset: IntegerFromString,
            limit: IntegerFromString,
            lang: t.string,
            tz: t.string
          })
        ])
      }))
    )
    private async getEvents(
      @queryParam('macAddress') macAddress?: string,
      @queryParam('locationId') locationId?: string,
      @queryParam('from') from?: string,
      @queryParam('to') to?: string,
      @queryParam('limit') limit?: number,
      @queryParam('offset') offset?: number,
      @queryParam('lang') lang?: string,
      @queryParam('tz') tz?: string
    ): Promise<FloDetectResponseEventPage> {

      return this.floDetectService.getEvents( 
        macAddress ? { macAddress } : { locationId: locationId || '' },
        {
          from,
          to,
          limit,
          offset,
          lang,
          tz
        }
      );
    }

    @httpPost('/events/:id',
      auth,
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: t.type({
          feedback: t.type({
            id: t.number
          })
        })
      }))
    )
    private async submitEventFeedbackV2(
      @request() req: Request, 
      @requestParam('id') eventId: string, 
      @requestBody() { feedback: { id: feedbackId } }: { feedback: { id: number } }
    ): Promise<any> {
      // TODO better auth
      const tokenMetadata = req.token;
      const userId = tokenMetadata && tokenMetadata.user_id;

      await this.floDetectService.submitEventFeedbackV2(eventId, feedbackId, userId);

      return this.json(
        { 
          feedback: { 
            id: feedbackId, 
            ...(userId && { user: { id: userId } }) 
          }
        },
        202
      );
    }
  }

  return FloDetectController;
}