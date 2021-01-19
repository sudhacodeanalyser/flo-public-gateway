import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { inject, injectable } from 'inversify';
import UserEmailChangeTable from './UserEmailChangeTable';
import { EmailChangeStatus, UserEmailChangeResponse, UserEmailChangeVerifyResponse, UserEmailType } from '../api';
import { UserService } from './UserService';
import NotFoundError from '../api/error/NotFoundError';
import ExtendableError from '../api/error/ExtendableError';
import EmailClient from '../../email/EmailClient';
import { LocalizationService } from '../localization/LocalizationService';
import ConflictError from '../api/error/ConflictError';
import ForbiddenError from '../api/error/ForbiddenError';

@injectable()
class UserEmailChangeService {
  constructor(
    @inject('UserEmailChangeTable') private userEmailChangeTable: UserEmailChangeTable,
    @inject('UserService') private userService: UserService,
    @inject('EmailClient') private emailClient: EmailClient,
    @inject('LocalizationService') private localizationService: LocalizationService
  ) {}

  public async requestEmailChange(newEmail: string, userId: string): Promise<UserEmailChangeResponse> {
    const user = await this.userService.getUserByEmail(newEmail, {
      $select: {
        id: true,
      }
    });
    if (user) {
      throw new ConflictError('New email is already in use.');
    }

    const maybeAUser = await this.userService.getUserById(userId, {
      $select: {
        email: true,
        locale: true,
      }
    });

    if (O.isNone(maybeAUser) || maybeAUser.value.email === undefined) {
      throw new NotFoundError('User email not found');
    }

    const maybeEmailChangeData = await this.userEmailChangeTable.create({
      userId,
      old: { email: maybeAUser.value.email },
      new: { email: newEmail }
    });
    const emailChangeData = pipe(
      maybeEmailChangeData,
      O.fold(
        () => {
          throw new ExtendableError('Could not create email change request', 500)
        },
       data => data
      )
    );

    await Promise.all([
      this.sendConfirmationEmail(newEmail, emailChangeData.new.key, emailChangeData.id.toString(), UserEmailType.CONFIRM_NEW_EMAIL, maybeAUser.value.locale),
      this.sendConfirmationEmail(maybeAUser.value.email, emailChangeData.old.key, emailChangeData.id.toString(), UserEmailType.CONFIRM_OLD_EMAIL, maybeAUser.value.locale),
    ]);

    return {
      userId,
      newEmail,
      oldEmail: emailChangeData.old.email,
    }
  }

  public async verifyEmailChange(userId: string, type: UserEmailType, id: number, key: string): Promise<UserEmailChangeVerifyResponse> {
    const emailChangeData = pipe(
      await this.userEmailChangeTable.getById(id),
      O.fold(
        () => {
          throw new ForbiddenError('Invalid confirmation id/key');
        },
        data => data
      )
    );
    const user = await this.userService.getUserByEmail(emailChangeData.new.email, {
      $select: {
        id: true,
      }
    });
    if (user) {
      throw new ConflictError('New email is already in use.');
    }

    const maybeConfirmResult = await ((type === UserEmailType.CONFIRM_OLD_EMAIL) ?
      this.userEmailChangeTable.confirmOld(id, key, userId) :
      this.userEmailChangeTable.confirmNew(id, key, userId));

    const status = pipe(
      maybeConfirmResult,
      O.fold(
        () => {
          throw new ForbiddenError('Invalid confirmation id/key');
        },
        d => (d.old.on && d.new.on) ? EmailChangeStatus.COMPLETED : !d.old.on ? EmailChangeStatus.PENDING_OLD : EmailChangeStatus.PENDING_NEW
      )
    );

    if (status === EmailChangeStatus.COMPLETED) {
      await this.userService.updatePartialUser(userId, { email: emailChangeData.new.email as any });
    }

    return {
      oldEmail: emailChangeData.old.email,
      newEmail: emailChangeData.new.email,
      status,
      userId
    }
  }

  private async sendConfirmationEmail(email: string, key: string, confirmationId: string, type: UserEmailType, locale?: string): Promise<void> {
    const { localizedValue: templateId } = await this.localizationService.getLocalizedValue({
      name: 'user.email-change.template',
      type: 'email',
      locale: locale || 'en-us',
    });

    return this.emailClient.send(email, templateId, {
      key,
      id: confirmationId,
      type,
    });
  }
}

export { UserEmailChangeService };
