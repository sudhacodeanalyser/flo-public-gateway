import { inject, injectable } from 'inversify';
import _ from 'lodash';
import * as O from 'fp-ts/lib/Option';
import LteTable from './LteTable';
import DeviceLteTable from './DeviceLteTable';
import { Lte, SsidCredentials } from '../api';
import { LteRecord } from './LteRecord';
import { pipe } from 'fp-ts/lib/pipeable';
import crypto from 'crypto';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';

type Option<T> = O.Option<T>;

@injectable()
class LteService {

  constructor(
    @inject('LteTable') private lteTable: LteTable,
    @inject('DeviceLteTable') private deviceLteTable: DeviceLteTable,
  ) {}

  public async getSsidCredentials(qrCode: string): Promise<Option<SsidCredentials>> {
    const maybeLteRecordData = await this.lteTable.get({qr_code: qrCode});

    return pipe(
      O.fromNullable(maybeLteRecordData),
      O.map(lteRecordData => {
        const lte = new LteRecord(lteRecordData).toModel();
        return this.extractCredentials(lte)
      })
    );
  }

  public async linkDevice(qrCode: string, deviceId: string): Promise<void> {
    const maybeLteRecordData = await this.lteTable.get({qr_code: qrCode});

    return pipe(
      O.fromNullable(maybeLteRecordData),
      O.fold(
        async () => { throw new ResourceDoesNotExistError('LTE device not found.') },
        async lteRecordData => {
          const lte = new LteRecord(lteRecordData).toModel();
          return this.deviceLteTable.linkDevice(lte.imei, deviceId);
        }
      )
    );
  }

  public async unlinkDevice(deviceId: string): Promise<void> {
    return this.deviceLteTable.unlinkDevice(deviceId);
  }

  private extractCredentials(lte: Lte): SsidCredentials {
    const randomKeyBytes = Buffer.from(lte.randomKey, 'hex');
    const ssid = this.computeSha256(randomKeyBytes.slice(lte.ssidOffset, lte.ssidOffset + 64)).slice(0, 16);
    const password = this.computeSha256(randomKeyBytes.slice(lte.passwordOffset, lte.passwordOffset + 64)).slice(0, 17);
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