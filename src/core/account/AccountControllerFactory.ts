import * as express from 'express';
import { interfaces, controller, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam } from 'inversify-express-utils';
import { injectable, inject, Container } from 'inversify';
import AccountService from './AccountService';

export function AccountControllerFactory(container: Container): interfaces.Controller {
  @controller('/accounts', 'LoggerMiddleware')
  class AccountController implements interfaces.Controller {
    constructor(
      @inject('AccountService') private accountService: AccountService
    ) {}

    // TODO
    // @httpGet('/:id')
    // private getAccount(@requestParam('id') id: string):  {

    //   return this.accountService.getAccountById(id);
    // }
  }

  return AccountController;
}