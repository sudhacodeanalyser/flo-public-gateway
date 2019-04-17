import _ from 'lodash';
import * as express from 'express';
import * as t from 'io-ts';
import { interfaces, controller, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam, requestBody } from 'inversify-express-utils';
import { injectable, inject, Container } from 'inversify';
import UserService from './UserService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { parseExpand } from '../api/controllerUtils';

export function UserControllerFactory(container: Container) {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @controller('/users', 'LoggerMiddleware')
  class UserController implements interfaces.Controller {
    constructor(
      @inject('UserService') private userService: UserService
    ) {}

    @httpGet('/:id',
      // TODO refine validations
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    private getUser(@requestParam('id') id: string, @queryParam('expand') expand?: string) {
      const expandProps = parseExpand(expand);

      return this.userService.getUserById(id, expandProps);
    }

  }

  return UserController;
}