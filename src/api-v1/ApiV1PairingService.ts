import { inject, injectable } from 'inversify';
import { ApiV1Service } from './ApiV1Service';
import * as t from 'io-ts';

const QrCodeV1Codec = t.type({
  i: t.string,
  e: t.string
});
const QrCodeV2Codec = t.string;
const QrCodeCodec = t.union([
  QrCodeV1Codec,
  QrCodeV2Codec
]);

const QrDataCodec = t.type({
  data: QrCodeCodec
});

export const QrDataValidator = t.exact(QrDataCodec);

export type QrCodeV1 = t.TypeOf<typeof QrCodeV1Codec>;
export type QrCodeV2 = t.TypeOf<typeof QrCodeV2Codec>;
export type QrCode = t.TypeOf<typeof QrCodeCodec>;
export type QrData = t.TypeOf<typeof QrDataCodec>;

export interface PairingData {
  id: string,
  ap_name: string,
  ap_password: string,
  device_id: string,
  login_token: string,
  client_cert: string,
  client_key: string,
  server_cert: string,
  websocket_cert?: string,
  websocket_cert_der?: string,
  websocket_key: string
}

export interface CompletePairingData {
  macAddress: string,
  timezone: string
};

@injectable()
class ApiV1PairingService extends ApiV1Service {
  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string
  ) {
    super();
  }

  public async initPairing(authToken: string, qrData: QrData): Promise<PairingData> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/pairing/init`,
      body: qrData,
      authToken
    };

    return this.sendRequest<PairingData>(request);
  }

  public async completePairing(authToken: string, pairingId: string, data: CompletePairingData): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/pairing/complete/${ pairingId }`,
      body: {
        device_id: data.macAddress,
        timezone: data.timezone
      },
      authToken
    };

    await this.sendRequest<any>(request);
  }
}

export { ApiV1PairingService };