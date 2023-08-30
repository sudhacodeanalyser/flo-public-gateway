import { inject, injectable } from 'inversify';
import * as _ from 'lodash';
import * as O from 'fp-ts/lib/Option';
import LteTable from './LteTable';
import DeviceLteTable from './DeviceLteTable';
import { DeviceService, EntityActivityAction, EntityActivityService, EntityActivityType,} from '../service';
import { BaseLte, Device, Lte, LteContext, SsidCredentials, SsidCredentialsWithContext } from '../api';
import { pipe } from 'fp-ts/lib/pipeable';
import crypto from 'crypto';
import ResourceDoesNotExistError from '../api/error/ResourceDoesNotExistError';
import NotFoundError from '../api/error/NotFoundError';
import { DeviceResolver } from './DeviceResolver';
import { stripNulls } from '../api/controllerUtils';
import Logger from 'bunyan';

type Option<T> = O.Option<T>;

@injectable()
class LteService {

  constructor(
    @inject('Logger') private logger: Logger,
    @inject('DeviceResolver') private deviceResolver: DeviceResolver,
    @inject('LteTable') private lteTable: LteTable,
    @inject('DeviceLteTable') private deviceLteTable: DeviceLteTable,
    @inject('EntityActivityService') private entityActivityService: EntityActivityService
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
    return this.getSsidCredentialsWithContext(maybeLte)
  }

  public async getCurrentCredentials(deviceId: string): Promise<Option<SsidCredentialsWithContext>> {
    const maybeLte = await this.lteTable.getByDeviceId(deviceId);
    return this.getSsidCredentialsWithContext(maybeLte)
  }

  public async retrieveQrCode(imei: string): Promise<LteContext> {
    const maybeLte = await this.lteTable.getByImei(imei);
    return pipe(
      maybeLte,
      O.fold(
        async () => { throw new NotFoundError('LTE Device not found'); },
        async lte => ({
          qrCode: lte.qrCode,
          imei: lte.imei,
          iccid: lte.iccid
        })
      )
    );
  }

  public async linkDevice(deviceId: string, macAddress: string, qrCode: string): Promise<void> {
    const maybeExistingLteLink = await this.lteTable.getByDeviceId(deviceId);

    const existingLteLink = pipe(
      maybeExistingLteLink,
      O.toNullable
    );

    const maybeLte = await this.lteTable.getByQrCode(qrCode);
    return pipe(
      maybeLte,
      O.fold(
        async () => { throw new ResourceDoesNotExistError('LTE device not found.') },
        async lte => {

          if (existingLteLink !== undefined && lte.imei === existingLteLink?.imei) {
              return
          }

          const linked = await this.deviceLteTable.linkDevice(deviceId, lte.imei)
          if (!linked) {
            this.logger.warn(`LTE linking failed for ${deviceId} and ${lte.imei}}`);
            return; // Don't send event if linking failed
          }

          const device: Device | null = await this.deviceResolver.get(deviceId, DeviceService.ALL_DEVICE_DETAILS);

          await this.entityActivityService.publishEntityActivity(
            EntityActivityType.DEVICE,
            EntityActivityAction.UPDATED,
            {
              ...(stripNulls(device, {} as unknown as Device)),
              id: deviceId,
              macAddress,
              lte_paired: true,
              lte
            },
            true
          )

        }
      )
    );
  }

  public async unlinkDevice(deviceId: string, macAddress: string): Promise<void> {
    const hadLteLink = await this.deviceLteTable.unlinkDevice(deviceId);
    if (!hadLteLink) { return; } // Only LTE linked devices should announce unlinking
    
    const device: Device | null = await this.deviceResolver.get(deviceId, DeviceService.ALL_DEVICE_DETAILS);

    await this.entityActivityService.publishEntityActivity(
      EntityActivityType.DEVICE,
      EntityActivityAction.UPDATED,
      {
        ...(stripNulls(device, {} as unknown as Device)),
        id: deviceId,
        macAddress,
        lte_paired: false,
      },
      true
    )

  }

  private getSsidCredentialsWithContext(maybeLte: Option<Lte>): Option<SsidCredentialsWithContext> {
    return pipe(
      maybeLte,
      O.map(lte => ({
        ...this.extractCredentials(lte),
        imeiLast4: lte.imei.slice(-4),
        iccidLast4: lte.iccid.slice(-4)
      }))
    );
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