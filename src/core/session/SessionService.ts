import { inject, injectable } from 'inversify';
import { UserService } from '../service';
import { DependencyFactoryFactory } from '../api';
import ForbiddenError from '../api/error/ForbiddenError';
import { FirestoreAuthService, FirestoreTokenResponse, FirestoreAssests } from './FirestoreAuthService';
import * as Option from 'fp-ts/lib/Option';
import * as _ from 'lodash';
import { AuthCache } from '../../auth/AuthCache';
import { ApiV1LogoutService } from '../../api-v1/logout/ApiV1LogoutService';
import ValidationError from '../api/error/ValidationError';

const MAX_AUTH_DEVICE_ASSETS = 50;

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

    const devicesAdditionalAssets = _.get(additionalAssets, 'devices', []);
    let devicesAssets;
    if ((devicesAdditionalAssets.length + devicesAsset.length) < MAX_AUTH_DEVICE_ASSETS) {
      devicesAssets = [...devicesAsset, ...devicesAdditionalAssets];
    } else if (devicesAdditionalAssets.length && devicesAdditionalAssets.length < MAX_AUTH_DEVICE_ASSETS) {
      devicesAssets = devicesAdditionalAssets;
    } else {
      throw new ValidationError(`The number of devices exceeded the limit of ${MAX_AUTH_DEVICE_ASSETS}. Filtering can be used instead, providing a list of devices up to ${MAX_AUTH_DEVICE_ASSETS}`);
    }

    return this.firestoreAuthService.issueToken({ 
      ...additionalAssets,
      devices: devicesAssets ,
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