import { inject, injectable } from 'inversify';
import { UserService } from '../service';
import { DependencyFactoryFactory } from '../api';
import ForbiddenError from '../api/error/ForbiddenError';
import { FirestoreAuthService, FirestoreTokenResponse } from './FirestoreAuthService';
import * as Option from 'fp-ts/lib/Option';
import _ from 'lodash';

@injectable()
class SessionService {
  private userServiceFactory: () => UserService;

  constructor(
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('FirestoreAuthService') private firestoreAuthService: FirestoreAuthService
  ) {
    this.userServiceFactory = depFactoryFactory<UserService>('UserService');
  }

  public async issueFirestoreToken(userId: string): Promise<FirestoreTokenResponse> {
    const user = await this.userServiceFactory().getUserById(userId, ['locations']);

    if (Option.isNone(user)) {
      throw new ForbiddenError();
    }

    const devicesAsset = _.flatMap(
      user.value.locations,
      ({ devices }) => (devices || [])
        .map(({ macAddress }) => macAddress)
        .filter(_.identity) as string[]
    );
    const locationsAsset = user.value.locations
      .map(({ id }) => id);

    return this.firestoreAuthService.issueToken({ 
      devices: devicesAsset,
      locations: locationsAsset,
      users: [user.value.id]
    });
  }
}

export { SessionService };