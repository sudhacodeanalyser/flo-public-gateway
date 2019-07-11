import { inject, injectable } from 'inversify';
import UnauthorizedError from '../auth/UnauthorizedError';
import Request from '../core/api/Request';
import { HealthTestService, HealthTestServiceFactory } from '../core/device/HealthTestService';
import { DefaulthHealthTestService } from './DefaultHealthTestService';

@injectable()
class DefaultHealthTestServiceFactory implements HealthTestServiceFactory  {

  constructor(
    @inject('healthTestServiceUrl') private readonly healthTestServiceUrl: string
  ) {}

  public create(req: Request): HealthTestService {
    const authToken = req.get('Authorization');

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return new DefaulthHealthTestService(this.healthTestServiceUrl, authToken);
  }
}

export { DefaultHealthTestServiceFactory };

