import { inject, injectable } from 'inversify';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import * as uuid from 'uuid';
import * as Option from 'fp-ts/lib/Option';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as AsyncEither from 'fp-ts/lib/TaskEither';
import PuckTokenMetadataTable from './PuckTokenMetadataTable';
import * as _ from 'lodash';
import { PuckPairingData } from '../api';
import { PuckTokenMetadata } from './PuckTokenMetadata';

@injectable()
class PuckTokenService {
  constructor(
    @inject('PuckTokenMetadataTable') private puckTokenMetadataTable: PuckTokenMetadataTable,
    @inject('PuckTokenSecret') private readonly puckTokenSecret: string,
    @inject('PuckPairingTokenTTL') private readonly puckPairingTokenTTL: string
  ) {}

  public async issueToken(puckId: string, ttl?: number, clientId?: string, data: any = {}): Promise<string> {
    const tokenId = uuid.v4();
    const createdAt = new Date().toISOString();
    const expiresAt = ttl && moment(createdAt).add(ttl, 'seconds').toISOString();
    const tokenData = {
      ...data,
      iat: moment(createdAt).unix(),
      puckId,
      clientId,
    };
    const tokenMetadata = _.pickBy({
      ...data,
      id: tokenId,
      createdAt,
      expiresAt,
      puckId,
      clientId
    }, value => value === true || !_.isEmpty(value));

    const encodedToken = await this.encodeToken(tokenId, tokenData, createdAt, ttl);

    await this.puckTokenMetadataTable.put(tokenMetadata as PuckTokenMetadata);

    return encodedToken;
  }

  public async verifyToken(token: string): Promise<E.Either<Error, PuckTokenMetadata>> {

    return pipe(
      () => this.decodeToken(token),
      AsyncEither.chain((decodedToken: any) =>
        () => this.lookupToken(decodedToken.jti)
      ),
    )();
  }

  public async retrievePairingData(puckId: string): Promise<Option.Option<PuckPairingData>> {
    const tokenMetadataArray = await this.puckTokenMetadataTable.getAllByPuckId(puckId);
    const currentTokenMetadata = _.find(tokenMetadataArray, (m: PuckTokenMetadata) => !m.isInit && !m.isRevoked);

    // Doesn't exist or is expired
    if (!currentTokenMetadata) {
      return Option.none;
    } else if (currentTokenMetadata.expiresAt && moment().isAfter(currentTokenMetadata.expiresAt)) {
      return Promise.reject(new Error('Token expired.'));
    }

    const tokenData = {
      ...currentTokenMetadata,
      id: undefined,
      iat: moment(currentTokenMetadata.createdAt).unix(),
    }

    const encodedToken = await this.encodeToken(currentTokenMetadata.id, tokenData, currentTokenMetadata.createdAt);
    return Option.some({
      accessToken: encodedToken
    });
  }

  private async encodeToken(tokenId: string, tokenData: any, createdAt: string, ttl?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        tokenData,
        this.puckTokenSecret,
        {
          jwtid: tokenId,
          ...(ttl && { expiresIn: ttl }),
        },
        (err: any, encodedToken: string | undefined) => {
          if (err) {
            reject(err);
          } else {
            resolve(encodedToken || '');
          }
      });
    });
  }

  private async decodeToken(token: string): Promise<E.Either<Error, any>> {

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.puckTokenSecret,
        (err, data) => {
          if (err) {
            resolve(E.left(err));
          } else {
            resolve(E.right(data));
          }
        }
      );
    });
  }

  private async lookupToken(tokenId: string): Promise<E.Either<Error, PuckTokenMetadata>> {
    try {
      const tokenMetadata = await this.puckTokenMetadataTable.get({ id: tokenId });

      // Doesn't exist or is expired
      if (!tokenMetadata) {
        return E.left(new Error('Token not found.'));
      } else if (
        tokenMetadata.expiresAt && moment().isAfter(tokenMetadata.expiresAt)
      ) {
        return E.left(new Error('Token expired.'));
      }

      return E.right(tokenMetadata);
    } catch (err: any) {
      return E.left(err);
    }
  }
}

export { PuckTokenService };