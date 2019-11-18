import { inject, injectable } from 'inversify';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import uuid from 'uuid';
import E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import AsyncEither from 'fp-ts/lib/TaskEither';
import Logger from 'bunyan';
import PuckTokenMetadataTable from './PuckTokenMetadataTable';

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
    const expiresAt = moment(createdAt).add(ttl, 'seconds').toISOString();
    const tokenData = {
      ...data,
      iat: createdAt,
      puckId,
      clientId,
    };
    const tokenMetadata = {
      ...data,
      id: tokenId,
      createdAt,
      expiresAt,
      puckId,
      clientId
    };
    const encodedToken = await this.encodeToken(tokenId, tokenData, createdAt, ttl);

    await this.puckTokenMetadataTable.put(tokenMetadata);

    return encodedToken;
  }

  public async verifyToken(token: string): Promise<E.Either<Error, any>> {

    return pipe(
      () => this.decodeToken(token),
      AsyncEither.chain((decodedToken: any) =>
        () => this.lookupToken(decodedToken.id)
      ),
    )();
  }

  private async encodeToken(tokenId: string, tokenData: any, createdAt: string, ttl?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(
        tokenData, 
        this.puckTokenSecret,
        {
          jwtid: tokenId,
          expiresIn: ttl || undefined,
        },
        (err: any, encodedToken: string) => {
          if (err) {
            reject(err);
          } else {
            resolve(encodedToken);
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
            reject(E.left(err));
          } else {
            resolve(E.right(data));
          }
        }
      );
    });   
  }

  private async lookupToken(tokenId: string): Promise<E.Either<Error, any>> {
    const tokenMetadata = await this.puckTokenMetadataTable.get({ id: tokenId });

    // Doesn't exist or is expired
    if (tokenMetadata) {
      return E.left(new Error('Token not found.'));
    } else if (
      moment().isAfter(
        moment(tokenMetadata.createdAt).add(2, 'hours')
      )
    ) {
      return E.left(new Error('Token expired.'));
    }

    return E.right(tokenMetadata);
  }
}

export { PuckTokenService };