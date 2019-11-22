import { inject, injectable } from 'inversify';
import UnauthorizedError from '../auth/UnauthorizedError';
import Request from '../core/api/Request';
import { HealthTestService, HealthTestServiceFactory } from '../core/device/HealthTestService';

@injectable()
class DefaultHealthTestServiceFactory implements HealthTestServiceFactory  {

  constructor(
    @inject('healthTestServiceUrl') private readonly healthTestServiceUrl: string,
    @inject('Factory<HealthTestService>') private healthTestServiceFactory: (url: string, authToken: string) => HealthTestService
  ) {}

  public create(req: Request): HealthTestService {
    const authToken = req.get('Authorization');

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return this.healthTestServiceFactory(this.healthTestServiceUrl, authToken);
  }
}

export { DefaultHealthTestServiceFactory };

