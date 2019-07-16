import { inject, injectable } from 'inversify';
import { UserService } from '../service';
import { DependencyFactoryFactory } from '../api';
import ForbiddenError from '../api/error/ForbiddenError';
import { FirestoreAuthService, FirestoreTokenResponse } from './FirestoreAuthService';
import { pipe } from 'fp-ts/lib/pipeable';
import * as TaskEither from 'fp-ts/lib/TaskEither';
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
    // TODO: Create a TaskEitherOption monad
    const task = pipe(
      TaskEither.tryCatch(
        async () => pipe(
          await this.userServiceFactory().getUserById(userId, ['locations']),
          Option.fold(
            () => Promise.reject(new ForbiddenError()),
            user => Promise.resolve(user)
          )
        ),
        err => err
      ),
      TaskEither.chain(user => {
        const devicesAsset = _.flatMap(
          user.locations,
          ({ devices }) => (devices || []).map(({ macAddress }) => macAddress).filter(_.identity) as string[]
        );

        return TaskEither.tryCatch(
          () => this.firestoreAuthService.issueToken({ devices: devicesAsset }),
          err => err
        )
      }),
      TaskEither.getOrElse(err => async () => Promise.reject(err))
    );

    return task();
  }
}

export { SessionService };