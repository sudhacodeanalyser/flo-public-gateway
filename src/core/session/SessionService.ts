import { inject, injectable } from 'inversify';
import { UserService } from '../service';
import { DependencyFactoryFactory } from '../api';
import ForbiddenError from '../api/error/ForbiddenError';
import { FirestoreAuthService, FirestoreTokenResponse, FirestoreAssests } from './FirestoreAuthService';
import * as Option from 'fp-ts/lib/Option';
import _ from 'lodash';
import { AuthCache } from '../../auth/AuthCache';
import { ApiV1LogoutService } from '../../api-v1/logout/ApiV1LogoutService';
@injectable()
class SessionService {
  private userServiceFactory: () => UserService;

  constructor(
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('FirestoreAuthService') private firestoreAuthService: FirestoreAuthService,
    @inject('AuthCache') private authCache: AuthCache,
    @inject('ApiV1LogoutService') private logoutService: ApiV1LogoutService
  ) {
    this.userServiceFactory = depFactoryFactory<UserService>('UserService');
  }

  public async issueFirestoreToken(userId: string, additionalAssets?: FirestoreAssests): Promise<FirestoreTokenResponse> {
    const user = await this.userServiceFactory().getUserById(userId, {
      $select: {
        id: true,
        locations: {
          $select: {
            id: true,
            devices: {
              $select: {
                macAddress: true
              }
            }
          }
        }
      }
    });

    const devicesAsset = Option.isNone(user) ? [] : _.flatMap(
      user.value.locations,
      ({ devices }) => (devices || [])
        .map(({ macAddress }) => macAddress)
        .filter(_.identity) as string[]
    );
    const locationsAsset = Option.isNone(user) ? [] : user.value.locations
      .map(({ id }) => id);

    return this.firestoreAuthService.issueToken({ 
      ...additionalAssets,
      devices: [...devicesAsset, ..._.get(additionalAssets, 'devices', [])] ,
      locations: [...locationsAsset, ..._.get(additionalAssets, 'locations', [])],
      users: [userId, ..._.get(additionalAssets, 'users', [])]
    });
  }

  public async logout(token: string): Promise<void> {

    await Promise.all([
      this.authCache.dropCache(token),
      this.logoutService.logout()
    ]);

  }
}

export { SessionService };