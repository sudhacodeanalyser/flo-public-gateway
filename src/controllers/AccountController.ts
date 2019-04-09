import * as express from 'express';
import { interfaces, controller, httpGet, httpPost, httpDelete, request, queryParam, response, requestParam } from 'inversify-express-utils';
import { injectable, inject } from 'inversify';
import AccountService from '../services/account/AccountService';

@controller('/accounts', 'LoggerMiddleware')
export class AccountController implements interfaces.Controller {
  constructor(
    @inject('AccountService') private accountService: AccountService
  ) {}

  @httpGet('/:id')
  private getAccount(@requestParam('id') id: string) {

    return this.accountService.getAccountById(id);
  }
}