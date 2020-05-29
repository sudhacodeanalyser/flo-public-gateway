import { inject, injectable } from 'inversify';
import { DirectiveServiceFactory, DirectiveService } from '../../core/device/DirectiveService';
import Request from '../../core/api/Request';
import UnauthorizedError from '../../auth/UnauthorizedError';

@injectable()
class ApiV1DirectiveServiceFactory implements DirectiveServiceFactory  {

  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string,
    @inject('ApiV1Token') private readonly apiV1Token: string,
    @inject('Factory<DirectiveService>') private directiveServiceFactory: (apiV1Url: string, authToken: string, customHeaders: any) => DirectiveService
  ) {}

  public create(req: Request): DirectiveService {
    const authToken = req.get('Authorization');
    const origin = req.get('origin');
    const userAgent = req.get('user-agent');
    const customHeaders = {
      ...(origin && { origin }),
      ...(userAgent && { 'user-agent': userAgent }),
      ...(authToken && { 'x-user-token': authToken })
    };

    return this.directiveServiceFactory(this.apiV1Url, `Bearer ${ this.apiV1Token }`, customHeaders);
  }
}

export { ApiV1DirectiveServiceFactory };
