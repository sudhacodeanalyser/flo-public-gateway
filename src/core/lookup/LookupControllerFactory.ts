import _ from 'lodash';
import {BaseHttpController, interfaces, queryParam, requestParam} from 'inversify-express-utils';
import {Container, inject} from 'inversify';
import {LookupService} from '../service';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import { httpController, httpGet, queryParamArray } from '../api/controllerUtils';
import {Lookup, LookupResponse, MultiLookupResponse} from '../api/response';


export function LookupControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  // Every call to a method in this controller will checkout a connection from Postgres connection pool
  // and release it upon sending the response
  @httpController({ version: apiVersion }, '/lists', 'PostgresConnectionMiddleware')
  class LookupController extends BaseHttpController {
    private static defaultLang = 'en';

    private static fixLang(lang: string): string {
      // Return default if empty
      if (_.isEmpty(lang)) {
        return LookupController.defaultLang
      }

      return _.head(lang.split('-'))!.toLowerCase();
    }

    constructor(
      @inject('LookupService') private lookupService: LookupService,
    ) {
      super();
    }

    @httpGet(
      '/',
      reqValidator.create(t.type({
        query: t.type({
          id: t.union([t.string, t.array(t.string)]),
          lang: t.union([t.undefined, t.string])
        })
      }))
    )
    private async getByIds(@queryParamArray('id') ids: string[], @queryParam('lang') lang: string = LookupController.defaultLang): Promise<MultiLookupResponse> {
      const cleanLang = LookupController.fixLang(lang);
      const lookups = await this.lookupService.getByIds(ids);

      if (!_.isEmpty(lookups)) {
        const result: any = ids.reduce((map: any, id) => {
          const item = lookups[id];
          const byLang = _.groupBy(item, 'lang');
          map[id] = byLang[cleanLang] || byLang[LookupController.defaultLang];
          return map;
        }, {});

        return Lookup.fromModelToMulti(result);
      }

      return Lookup.fromModelToMulti(lookups);
    }

    @httpGet(
      '/:id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.type({
          lang: t.union([t.undefined, t.string])
        })
      }))
    )
    private async getById(@requestParam('id') id: string, @queryParam('lang') lang: string = LookupController.defaultLang): Promise<LookupResponse> {
      const cleanLang = LookupController.fixLang(lang);
      const lookups = await this.lookupService.getByIds([id]);

      if (lookups[id]) {
        const item = lookups[id];
        const byLang = _.groupBy(item, 'lang');
        const filtered = byLang[cleanLang] || byLang[LookupController.defaultLang];
        const result = { [id]:filtered };

        return Lookup.fromModel(result);
      }

      return Lookup.fromModel(lookups);
    }
  }

  return LookupControllerFactory;
}