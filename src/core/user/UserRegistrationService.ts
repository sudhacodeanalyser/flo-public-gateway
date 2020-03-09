import { injectable, inject } from 'inversify';
import * as t from 'io-ts';
import UserRegistrationTokenMetadataTable from './UserRegistrationTokenMetadataTable';
import { UserAccountRole, UserLocationRole } from '../api';
import uuid from 'uuid';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import UnauthorizedError from '../api/error/UnauthorizedError';
import Logger from 'bunyan';
import { KafkaProducer } from '../../kafka/KafkaProducer';
import { LocalizationService } from '../service';
import EmailClient from '../../email/EmailClient';

export const UserRegistrationDataCodec = t.type({
  email: t.string,
  password: t.string,
  firstName: t.string,
  lastName: t.string,
  country: t.string,
  phone: t.string,
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

export interface UserRegistrationService {
  acceptTermsAndVerifyEmail(data: UserRegistrationData): Promise<void>;
  checkEmailAvailability(email: string): Promise<EmailAvailability>;
  resendVerificationEmail(email: string): Promise<void>;
  verifyEmailAndCreateUser(emailVerification: EmailVerification): Promise<OAuth2Response>;
  getRegistrationTokenByEmail(authToken: string, email: string): Promise<RegistrationTokenResponse>;
}

export interface InviteTokenData {
  tokenId: string;
  email: string;
  userLocationRoles: UserLocationRole[];
  userAccountRole: UserAccountRole;
  locale?: string;
}

@injectable()
export class UserInviteService {
  constructor(
    @inject('UserRegistrationTokenMetadataTable') private userRegistrationTokenMetatadataTable: UserRegistrationTokenMetadataTable,
    @inject('RegistrationTokenSecret') private tokenSecret: string,
    @inject('Logger') private logger: Logger,
    @inject('EmailClient') private emailClient: EmailClient,
    @inject('LocalizationService') private localizationService: LocalizationService
  ) {}

  public async sendInvite(email: string, token: string, locale?: string): Promise<void> {
    const { items: [{ value: templateId }]} = await this.localizationService.getAssets({ name: 'user.invite.template', type: 'email', locale });

    await this.emailClient.send(email, templateId, { auth: { token } });
  }

  public async issueToken(email: string, userAccountRole: UserAccountRole, userLocationRoles: UserLocationRole[], locale?: string, ttl?: number): Promise<{ token:string, metadata: InviteTokenData }> {
    const tokenId = uuid.v4();
    const tokenData = {
      token_id: tokenId,
      email,
      registration_data: {
        userAccountRole,
        userLocationRoles,
        locale
      },
      token_expires_at: ttl ? new Date(ttl * 1000).toISOString() : undefined,
      registration_data_expires_at: moment().add(30, 'days').toISOString()
    };
    const metadata =  await this.userRegistrationTokenMetatadataTable.put(tokenData);
    const token = await (new Promise<string>((resolve, reject) => 
      jwt.sign(
        { 
          ...tokenData.registration_data,
          email,
          iat: moment(metadata.created_at).unix()
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
            resolve(encodedToken);
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
        locale
      }
    };
  }

  public async getTokenByEmail(email: string): Promise<{ token:string, metadata: InviteTokenData } | null> {
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
          iat: moment(metadata.created_at).unix()
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
            resolve(encodedToken);
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
        locale: metadata.registration_data.locale
      }
    };
  }

  public async verifyToken(token:string): Promise<InviteTokenData> {
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
            isExpired: !!data.exp && moment.unix(data.exp).isBefore(moment())
          });
        }
      })
    ));


  }

  public async reissueToken(email: string, ttl?: number): Promise<{ token:string, metadata: InviteTokenData } | null> {
    const data = await this.userRegistrationTokenMetatadataTable.getByEmail(email);

    if (!data) {
      return null;
    }

    return this.issueToken(email, data.registration_data.userAccountRole, data.registration_data.userLocationRoles, data.registration_data.locale, ttl);
  }
}