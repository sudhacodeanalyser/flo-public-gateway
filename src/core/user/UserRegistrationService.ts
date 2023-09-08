import { injectable, inject } from 'inversify';
import * as t from 'io-ts';
import UserRegistrationTokenMetadataTable from './UserRegistrationTokenMetadataTable';
import { UserAccountRole, UserInviteMetadata, UserLocationRole, UserRegistrationPendingTokenMetadata, UserRegistrationTokenMetadata } from '../api';
import * as uuid from 'uuid';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import UnauthorizedError from '../api/error/UnauthorizedError';
import Logger from 'bunyan';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { LocalizationService } from '../service';
import EmailClient from '../../email/EmailClient';
import ConflictError from '../api/error/ConflictError';
import { UserRegistrationTokenMetadataRecord } from './UserRegistrationTokenMetadataRecord';
import { UserRegistrationPendingTokenMetadataRecord } from './UserRegistrationPendingTokenMetadataRecord';

export const UserRegistrationDataCodec = t.type({
  email: t.string,
  password: t.string,
  firstName: t.string,
  lastName: t.string,
  country: t.string,
  phone: t.string,
  skipEmailSend: t.union([t.undefined, t.boolean]),
  locale: t.union([t.undefined, t.string])
});

export type UserRegistrationData = t.TypeOf<typeof UserRegistrationDataCodec>;

export interface EmailAvailability {
  isRegistered: boolean;
  isPending: boolean;
}

export const EmailVerificationCodec = t.type({
  clientId: t.string,
  clientSecret: t.string,
  token: t.string
})

export type EmailVerification = t.TypeOf<typeof EmailVerificationCodec>;

export const OAuth2ResponseCodec = t.type({
  access_token: t.string,
  refresh_token: t.string,
  expires_in: t.Int,
  token_type: t.union([t.undefined, t.literal('Bearer')]),
  user_id: t.string,
  expires_at: t.union([t.undefined, t.string]),
  issued_at: t.union([t.undefined, t.string])
});

export const RegistrationTokenResponseCodec = t.type({
  token: t.string
});

export type OAuth2Response = t.TypeOf<typeof OAuth2ResponseCodec>;

export type RegistrationTokenResponse = t.TypeOf<typeof RegistrationTokenResponseCodec>;

export interface ImpersonationToken {
  token: string;
  timeNow: number;
  tokenExpiration: number;
}

export interface UserRegistrationService {
  acceptTermsAndVerifyEmail(data: UserRegistrationData): Promise<void>;
  checkEmailAvailability(email: string): Promise<EmailAvailability>;
  resendVerificationEmail(email: string): Promise<void>;
  verifyEmailAndCreateUser(emailVerification: EmailVerification): Promise<OAuth2Response>;
  getRegistrationTokenByEmail(authToken: string, email: string): Promise<RegistrationTokenResponse>;
  impersonateUser(userId: string, impersonatorEmail: string, impersonatorPassword: string): Promise<ImpersonationToken>;
}

export interface InviteTokenData {
  tokenId: string;
  email: string;
  userLocationRoles: UserLocationRole[];
  userAccountRole: UserAccountRole;
  locale?: string;
  supportEmails?: string[];
}

@injectable()
export class UserInviteService {
  constructor(
    @inject('UserRegistrationTokenMetadataTable') private userRegistrationTokenMetatadataTable: UserRegistrationTokenMetadataTable,
    @inject('RegistrationTokenSecret') private tokenSecret: string,
    @inject('Logger') private logger: Logger,
    @inject('EmailClient') private emailClient: EmailClient,
    @inject('LocalizationService') private localizationService: LocalizationService
  ) { }

  public async sendInvite(email: string, token: string, locale?: string, isOwner?: boolean): Promise<void> {
    const { items: [{ value: templateId }] } = await this.localizationService.getAssets({ name: `enterprise.invite${isOwner ? '-owner' : '-user'}.template`, type: 'email', locale });

    await this.emailClient.send(email, templateId, { auth: { token } });
  }

  public async issueToken(email: string, userAccountRole: UserAccountRole, userLocationRoles: UserLocationRole[], locale?: string, ttl?: number, accountId?: string, additionalMetadata?: UserInviteMetadata): Promise<{ token: string, metadata: InviteTokenData }> {
    const existingToken = await this.getTokenByEmail(email);

    if (existingToken) {
      throw new ConflictError('Email already has pending registration.');
    }
    const tokenExpiresAt = !ttl ? undefined : moment().add(ttl, 'seconds').toISOString();
    const tokenId = uuid.v4();
    const tokenData = {
      token_id: tokenId,
      email,
      registration_data: {
        userAccountRole,
        userLocationRoles,
        locale
      },
      token_expires_at: tokenExpiresAt,
      registration_data_expires_at: moment().add(30, 'days').toISOString(),
      account_id: accountId,
      support_emails: additionalMetadata?.supportEmails
    };
    const metadata = await this.userRegistrationTokenMetatadataTable.put(tokenData);
    const token = await (new Promise<string>((resolve, reject) =>
      jwt.sign(
        {
          ...tokenData.registration_data,
          email,
          iat: moment(metadata.created_at).unix(),
          supportEmails: tokenData.support_emails,
        },
        this.tokenSecret,
        {
          jwtid: tokenId,
          ...(ttl && { expiresIn: ttl })
        },
        (err, encodedToken) => {
          if (err) {
            reject(err);
          } else {
            resolve(encodedToken || '');
          }
        })
    )
    );

    return {
      token,
      metadata: {
        tokenId,
        email,
        userLocationRoles,
        userAccountRole,
        locale,
        supportEmails: additionalMetadata?.supportEmails
      }
    };
  }

  public async getTokenByEmail(email: string): Promise<{ token: string, metadata: InviteTokenData } | null> {
    const metadata = await this.userRegistrationTokenMetatadataTable.getByEmail(email);

    if (!metadata) {
      return null;
    }

    const ttl = metadata.token_expires_at ?
      Math.floor(moment(metadata.token_expires_at).diff(metadata.created_at, 'seconds')) :
      undefined;
    const token = await new Promise<string>((resolve, reject) =>
      jwt.sign(
        {
          ...metadata.registration_data,
          email,
          iat: moment(metadata.created_at).unix(),
          supportEmails: metadata.support_emails,
        },
        this.tokenSecret,
        {
          jwtid: metadata.token_id,
          ...(ttl && ttl > 0 ? { expiresIn: ttl } : undefined)
        },
        (err, encodedToken) => {
          if (err) {
            reject(err);
          } else {
            resolve(encodedToken || '');
          }
        }
      )
    );

    return {
      token,
      metadata: {
        tokenId: metadata.token_id,
        email: metadata.email,
        userAccountRole: metadata.registration_data.userAccountRole,
        userLocationRoles: metadata.registration_data.userLocationRoles,
        locale: metadata.registration_data.locale,
        supportEmails: metadata.support_emails
      }
    };
  }

  public async verifyToken(token: string): Promise<InviteTokenData> {
    try {
      const {
        isExpired,
        ...tokenData
      } = await this.decodeToken(token);

      if (isExpired) {
        throw new UnauthorizedError('Token expired.');
      }

      return tokenData;
    } catch (err) {
      this.logger.error({ err });
      throw new UnauthorizedError('Invalid token.');
    }
  }

  public async redeemToken(token: string): Promise<InviteTokenData> {
    const tokenData = await this.verifyToken(token);

    await this.userRegistrationTokenMetatadataTable.remove({ token_id: tokenData.tokenId });

    return tokenData;
  }

  public async decodeToken(token: string): Promise<InviteTokenData & { isExpired: boolean }> {
    return (new Promise<InviteTokenData & { isExpired: boolean }>((resolve, reject) =>
      jwt.verify(token, this.tokenSecret, { ignoreExpiration: true }, (err, decodedToken) => {
        if (err) {
          reject(err);
        } else {
          const data = decodedToken as any;
          resolve({
            tokenId: data.jti,
            email: data.email,
            userAccountRole: data.userAccountRole,
            userLocationRoles: data.userLocationRoles || [],
            locale: data.locale,
            isExpired: !!data.exp && moment.unix(data.exp).isBefore(moment()),
            supportEmails: data.supportEmails
          });
        }
      })
    ));


  }

  public async reissueToken(email: string, ttl?: number): Promise<{ token: string, metadata: InviteTokenData } | null> {
    const data = await this.userRegistrationTokenMetatadataTable.getByEmail(email);

    if (!data) {
      return null;
    }

    const additionalMetadata: UserInviteMetadata = {
      supportEmails: data.support_emails
    }

    await this.userRegistrationTokenMetatadataTable.remove({ token_id: data.token_id });

    return this.issueToken(email, data.registration_data.userAccountRole, data.registration_data.userLocationRoles, data.registration_data.locale, ttl, data.account_id, additionalMetadata);
  }

  public async revoke(email: string): Promise<void> {
    const tokenData = await this.userRegistrationTokenMetatadataTable.getByEmail(email);

    if (tokenData) {
      await this.userRegistrationTokenMetatadataTable.remove({ token_id: tokenData.token_id });
    }
  }

  public async getUserRegistrationTokenMetadataByAccountId(accountId: string): Promise<UserRegistrationTokenMetadata[]> {
    const records = await this.userRegistrationTokenMetatadataTable.getByAccountId(accountId);
    return Promise.all(records.map(datum => new UserRegistrationTokenMetadataRecord(datum).toModel()));
  }

  public async getAllPendingUserInvites(pageSize: number = 20, next?: string): Promise<{ items: UserRegistrationPendingTokenMetadata[], next?: string }> {
    let startKey;
    if (next) {
      startKey = {
        token_id: next
      };
    }
    const result = await this.userRegistrationTokenMetatadataTable.scan(pageSize, startKey);
    const records = result.items.map(datum => new UserRegistrationPendingTokenMetadataRecord(datum).toModel()).filter((model) => model.email);
    return { items: records, next: result.lastEvaluatedKey?.token_id }
  }
}
