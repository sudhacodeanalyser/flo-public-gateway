import * as _ from 'lodash';
import {BaseHttpController, interfaces, queryParam, requestParam} from 'inversify-express-utils';
import {Container, inject} from 'inversify';
import {LookupService} from '../service';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import { httpController, httpGet, queryParamArray } from '../api/controllerUtils';
import {Lookup, LookupResponse, MultiLookupResponse} from '../api/response';


export function LookupControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @httpController({ version: apiVersion }, '/lists')
  class LookupController extends BaseHttpController {
    private static defaultLang = 'en';

    constructor(
      @inject('LookupService') private lookupService: LookupService,
    ) {
      super();
    }

    @httpGet(
      '/',
      reqValidator.create(t.type({
        query: t.intersection([
          t.union([
            t.type({
              q: t.union([t.string, t.array(t.string)]),
              id: t.union([t.string, t.array(t.string)])
            }),
            t.type({
              q: t.union([t.string, t.array(t.string)])              
            }),
            t.type({
              id: t.union([t.string, t.array(t.string)])
            })
          ]),
          t.partial({
            lang: t.string
          })
        ])
      }))
    )
    private async getByIds(@queryParamArray('id') ids: string[] = [], @queryParamArray('q') prefixes: string[] = [], @queryParam('lang') lang: string = LookupController.defaultLang): Promise<MultiLookupResponse> {
      const lookups = await this.lookupService.getByIds(ids, prefixes, lang);

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
      const lookups = await this.lookupService.getByIds([id], undefined, lang);

      return Lookup.fromModel(lookups);
    }
  }

  return LookupControllerFactory;
}