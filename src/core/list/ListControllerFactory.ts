import _ from 'lodash';
import express from 'express';
import { interfaces, httpGet, queryParam, requestParam, requestBody, request, BaseHttpController } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { ListService } from '../service';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import * as t from 'io-ts';
import { httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { LookupResponse, MultiLookupResponse, Lookup } from '../api/response';


export function ListControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  // Every call to a method in this controller will checkout a connection from Postgres connection pool
  // and release it upon sending the response
  @httpController({ version: apiVersion }, '/lists', 'PostgresConnectionMiddleware')
  class ListController extends BaseHttpController {
    constructor(
      @inject('ListService') private listService: ListService,
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
      const lookups = await this.listService.getByIds(ids);

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
      const lookup = await this.listService.getByIds([id]);

      return Lookup.fromModel(lookup);
    }
  }

  return ListControllerFactory;
}