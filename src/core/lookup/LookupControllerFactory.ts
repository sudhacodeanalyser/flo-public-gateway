import _ from 'lodash';
import express from 'express';
import { interfaces, httpGet, queryParam, requestParam, requestBody, request, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { LookupService } from '../service';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import { httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { LookupResponse, MultiLookupResponse, Lookup } from '../api/response';


export function LookupControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  // Every call to a method in this controller will checkout a connection from Postgres connection pool
  // and release it upon sending the response
  @httpController({ version: apiVersion }, '/lists', 'PostgresConnectionMiddleware')
  class LookupController extends BaseHttpController {
    constructor(
      @inject('LookupService') private lookupService: LookupService,
    ) {
      super();
    }

    @httpGet(
      '/',
      reqValidator.create(t.type({
        query: t.type({
          id: t.string
        })
      }))
    )
    private async getByIds(@queryParam('id') idString: string): Promise<MultiLookupResponse> {
      const ids = idString.split(',');
      const lookups = await this.lookupService.getByIds(ids);

      return Lookup.fromModelToMulti(lookups);
    }

    @httpGet(
      '/:id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async getById(@requestParam('id') id: string): Promise<LookupResponse> {
      const lookup = await this.lookupService.getByIds([id]);

      return Lookup.fromModel(lookup);
    }
  }

  return LookupControllerFactory;
}