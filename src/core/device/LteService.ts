import { inject, injectable } from 'inversify';
import _ from 'lodash';
import * as O from 'fp-ts/lib/Option';
import LteTable from './LteTable';
import DeviceLteTable from './DeviceLteTable';
import { BaseLte, Lte, LteCreate, SsidCredentials, SsidCredentialsWithContext } from '../api';
import { pipe } from 'fp-ts/lib/pipeable';
import crypto from 'crypto';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import NotFoundError from '../api/error/NotFoundError';

type Option<T> = O.Option<T>;

@injectable()
class LteService {

  constructor(
    @inject('LteTable') private lteTable: LteTable,
    @inject('DeviceLteTable') private deviceLteTable: DeviceLteTable,
  ) {}

  public async createLte(lte: BaseLte): Promise<void> {
    const qrCode = this.generateQrCode(lte);
    const lteCreate = {
      offsetIndex: 1,
      ...lte,
      qrCode,
    }
    return this.lteTable.create(lteCreate);
  }

  public async getSsidCredentials(qrCode: string): Promise<Option<SsidCredentialsWithContext>> {
    const maybeLte = await this.lteTable.getByQrCode(qrCode);
    return pipe(
      maybeLte,
      O.map(lte => ({
        ...this.extractCredentials(lte),
        imeiLast4: lte.imei.slice(-4),
        iccidLast4: lte.iccid.slice(-4)
      }))
    );
  }

  public async retrieveQrCode(imei: string): Promise<string> {
    const maybeLte = await this.lteTable.getByImei(imei);
    return pipe(
      maybeLte,
      O.fold(
        async () => { throw new NotFoundError('LTE Device not found'); },
        async lte => lte.qrCode
      )
    );
  }

  public async linkDevice(deviceId: string, qrCode: string): Promise<void> {
    const maybeLte = await this.lteTable.getByQrCode(qrCode);
    return pipe(
      maybeLte,
      O.fold(
        async () => { throw new ResourceDoesNotExistError('LTE device not found.') },
        async lte => this.deviceLteTable.linkDevice(deviceId, lte.imei)
      )
    );
  }

  public async unlinkDevice(deviceId: string): Promise<void> {
    return this.deviceLteTable.unlinkDevice(deviceId);
  }

  private generateQrCode(lte: BaseLte): string {
    const b = Buffer.from(`${lte.imei}-${lte.iccid}-${lte.randomKey}`, 'utf-8');
    const sha256 = this.computeSha256(b);
    return `lte-${sha256}`;
  }

  private extractCredentials(lte: Lte): SsidCredentials {
    const ssidStart = lte.ssidOffset - 1;
    const pwdStart = lte.passwordOffset - 1;
    // We concatenate the key since (offset + 64) needs to start from the beginning if it exceeds the key length.
    const randomKeyBytes = Buffer.from(lte.randomKey.concat(lte.randomKey), 'hex');
    const ssid = this.computeSha256(randomKeyBytes.slice(ssidStart, ssidStart + 64)).slice(0, 16);
    const password = this.computeSha256(randomKeyBytes.slice(pwdStart, pwdStart + 64)).slice(0, 17);
    return {
      ssid,
      password
    };
  }

  private computeSha256(b: Buffer): string {
    return crypto
      .createHash('sha256')
      .update(b)
      .digest('hex');
  }
}

export { LteService };