import { inject, injectable } from 'inversify';
import { DirectiveServiceFactory, DirectiveService } from '../../core/device/DirectiveService';
import Request from '../../core/api/Request';
import UnauthorizedError from '../../auth/UnauthorizedError';

@injectable()
class ApiV1DirectiveServiceFactory implements DirectiveServiceFactory  {

  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string,
    @inject('Factory<DirectiveService>') private directiveServiceFactory: (apiV1Url: string, authToken: string, customHeaders: any) => DirectiveService
  ) {}

  public create(req: Request): DirectiveService {
    const authToken = req.get('Authorization');
    const customHeaders = {
      'user-agent': req.get('user-agent'),
      'origin': req.get('origin')
    };

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return this.directiveServiceFactory(this.apiV1Url, authToken, customHeaders);
  }
}

export { ApiV1DirectiveServiceFactory };
