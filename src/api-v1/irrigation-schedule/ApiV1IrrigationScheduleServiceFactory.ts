import { inject, injectable } from 'inversify';
import { IrrigationScheduleServiceFactory, IrrigationScheduleService } from '../../core/device/IrrigationScheduleService';
import Request from '../../core/api/Request';
import UnauthorizedError from '../../auth/UnauthorizedError';
import { ApiV1IrrigationScheduleService } from './ApiV1IrrigationScheduleService';

@injectable()
class ApiV1IrrigationScheduleServiceFactory implements IrrigationScheduleServiceFactory  {

  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string,
    @inject('Factory<IrrigationScheduleService>')  private readonly irrigationScheduleServiceFactory: (apiV1Url: string, authToken: string) => IrrigationScheduleService
  ) {}

  public create(req: Request): IrrigationScheduleService {
    const authToken = req.get('Authorization');

    if (authToken === undefined)  {
      throw new UnauthorizedError();
    }

    return this.irrigationScheduleServiceFactory(this.apiV1Url, authToken);
  }
}

export { ApiV1IrrigationScheduleServiceFactory };