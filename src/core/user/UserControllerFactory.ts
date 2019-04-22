import _ from 'lodash';
import * as express from 'express';
import * as t from 'io-ts';
import { interfaces, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam, requestBody } from 'inversify-express-utils';
import { injectable, inject, Container } from 'inversify';
import UserService from './UserService';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { User, UserUpdateValidator, UserUpdate } from '../api/api';
import { httpController, parseExpand } from '../api/controllerUtils';

export function UserControllerFactory(container: Container): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @httpController({ version: 1 }, '/users')
  class UserController implements interfaces.Controller {
    constructor(
      @inject('UserService') private userService: UserService
    ) {}

    @httpPost(
      '/:id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        body: UserUpdateValidator
      }))
    )
    private async updatePartialUser(@requestParam('id') id: string, @requestBody() userUpdate: UserUpdate): Promise<User> {
      return this.userService.updatePartialUser(id, userUpdate);
    }

    @httpGet('/:id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        }),
        query: t.partial({
          expand: t.string
        })
      }))
    )
    private async getUser(@requestParam('id') id: string, @queryParam('expand') expand?: string): Promise<User | {}> {
      const expandProps = parseExpand(expand);

      return this.userService.getUserById(id, expandProps);
    }

    @httpDelete(
      '/:id',
      reqValidator.create(t.type({
        params: t.type({
          id: t.string
        })
      }))
    )
    private async removeUser(@requestParam('id') id: string): Promise<void> {
      return this.userService.removeUser(id);
    }
  }

  return UserController;
}