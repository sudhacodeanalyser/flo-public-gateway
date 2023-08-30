import { Container, inject } from 'inversify';
import { BaseHttpController, httpPost, interfaces, request, queryParam, requestParam, response, requestBody } from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { 
  FloDetectResponseEventPage, 
  FloDetectResponseFixtures, 
  FloDetectResponseTrendsPage
} from '../api';
import { httpController, httpGet, queryParamArray, parseExpand } from '../api/controllerUtils';
import Request from '../api/Request';
import { FloDetectService } from '../service';
import { either } from 'fp-ts/lib/Either';
import UnauthorizedError from '../api/error/UnauthorizedError';
import express from 'express';
import GoneError from '../api/error/GoneError';
import { IntegerFromString } from '../api/validator/IntegerFromString';

export function FloDetectControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');

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

  @httpController({ version: apiVersion }, '/flodetect')
  class FloDetectController extends BaseHttpController {
    constructor(
      @inject('FloDetectService') private floDetectService: FloDetectService,
    ) {
      super();
    }

    @httpGet('/computations')
    private async getLatestComputation(): Promise<any> {

      throw new GoneError();
    }

    @httpGet('/computations/:id/events')
    private async getEventChronologyPage(): Promise<any> {

      throw new GoneError();
    }
    
    @httpPost('/computations/:id/events/:startDate')
    private async submitEventFeedback(): Promise<any> {
      throw new GoneError();
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
            tz: t.string,
            expand: t.string
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
      @queryParam('tz') tz?: string,
      @queryParam('expand') expand?: string
    ): Promise<FloDetectResponseEventPage> {
      const parsedExpand = parseExpand(expand);

      return this.floDetectService.getEvents( 
        macAddress ? { macAddress } : { locationId: locationId || '' },
        {
          from,
          to,
          limit,
          offset,
          lang,
          tz
        },
        parsedExpand
      );
    }

    @httpGet('/events/:id',
      // Auth deferred to method body
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    private async getEventById(
      @request() req: Request,
      @response() res: express.Response,
      @requestParam('id') eventId: string, 
      @queryParam('expand') expand?: string
    ): Promise<any> {
      
      if (!req.get('Authorization')) {
        throw new UnauthorizedError('Missing token.');
      }

      const parsedExpand = parseExpand(expand);
      const event = await this.floDetectService.getEventById(eventId, parsedExpand);

      await (new Promise((resolve, reject) => authMiddlewareFactory.create(
        () => Promise.resolve({ device_id: event.macAddress })
      )(req, res, err => err ? reject(err) : resolve(undefined))));

      return event;
    }

    @httpPost('/events/:id',
      // Auth deferred to method body
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
      @response() res: express.Response,
      @requestParam('id') eventId: string, 
      @requestBody() { feedback: { id: feedbackId } }: { feedback: { id: number } }
    ): Promise<any> {

      if (!req.get('Authorization')) {
        throw new UnauthorizedError('Missing token.');
      }

      const event = await this.floDetectService.getEventById(eventId);

      await (new Promise((resolve, reject) => authMiddlewareFactory.create(
        () => Promise.resolve({ device_id: event.macAddress })
      )(req, res, err => err ? reject(err) : resolve(undefined))));

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

    @httpGet('/trends',
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
            minDuration: IntegerFromString,
            offset: IntegerFromString,
            limit: IntegerFromString,
            tz: t.string
          })
        ])
      }))
    )
    private async getTrends(
      @queryParam('macAddress') macAddress?: string,
      @queryParam('locationId') locationId?: string,
      @queryParam('from') from?: string,
      @queryParam('to') to?: string,
      @queryParam('minDuration') minDuration?: number,
      @queryParam('limit') limit?: number,
      @queryParam('offset') offset?: number,
      @queryParam('tz') tz?: string
    ): Promise<FloDetectResponseTrendsPage> {
      return this.floDetectService.getTrends( 
        macAddress ? { macAddress } : { locationId: locationId || '' },
        {
          from,
          to,
          minDuration,
          limit,
          offset,
          tz
        }
      );
    }
  }

  return FloDetectController;
}