import { inject, injectable } from 'inversify';
import { DirectiveServiceFactory, DirectiveService } from '../../core/device/DirectiveService';
import Request from '../../core/api/Request';
import UnauthorizedError from '../../auth/UnauthorizedError';
import { ApiV1DirectiveService } from './ApiV1DirectiveService';

@injectable()
class ApiV1DirectiveServiceFactory implements DirectiveServiceFactory  {

  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string,
    @inject('Factory<DirectiveService>') private directiveServiceFactory: (apiV1Url: string, authToken: string) => DirectiveService
  ) {}

  public create(req: Request): DirectiveService {
    const authToken = req.get('Authorization');

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return this.directiveServiceFactory(this.apiV1Url, authToken);
  }
}

export { ApiV1DirectiveServiceFactory };