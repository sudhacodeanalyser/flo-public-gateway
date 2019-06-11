import { inject, injectable } from 'inversify';
import { DirectiveServiceFactory, DirectiveService } from '../../core/device/DirectiveService';
import Request from '../../core/api/Request';
import UnauthorizedError from '../../auth/UnauthorizedError';
import { ApiV1DirectiveService } from './ApiV1DirectiveService';

@injectable()
class ApiV1DirectiveServiceFactory implements DirectiveServiceFactory  {

  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string
  ) {}

  public create(req: Request): DirectiveService {
    const authToken = req.get('Authorization');

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return new ApiV1DirectiveService(this.apiV1Url, authToken);
  }
}

export { ApiV1DirectiveServiceFactory };