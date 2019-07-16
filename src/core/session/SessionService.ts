import { inject, injectable } from 'inversify';
import { UserService } from '../service';
import { DependencyFactoryFactory } from '../api';
import ForbiddenError from '../api/error/ForbiddenError';
import { FirestoreAuthService, FirestoreTokenResponse } from './FirestoreAuthService';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TaskEither from 'fp-ts/lib/TaskEither';
import * as Option from 'fp-ts/lib/Option';
import _ from 'lodash';
import * as TaskEitherOption from '../../util/TaskEitherOption';

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
    const task =  pipe(
      TaskEitherOption.tryCatchOption(
        () => this.userServiceFactory().getUserById(userId, ['locations']),
        err => err
      ),
      TaskEitherOption.chain(user => {
        const devicesAsset = _.flatMap(
          user.locations,
          ({ devices }) => (devices || [])
            .map(({ macAddress }) => macAddress)
            .filter(_.identity) as string[]
        );

        return TaskEitherOption.tryCatch(
          () => this.firestoreAuthService.issueToken({ devices: devicesAsset }),
          err => err
        );    
      }),
      TaskEitherOption.fold(
        err => async () => Promise.reject(err),
        () => async () => Promise.reject(new ForbiddenError()),
        tokenResponse => async () => tokenResponse
      )
    );

    return task();
  }
}

export { SessionService };