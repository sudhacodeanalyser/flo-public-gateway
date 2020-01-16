import * as t from 'io-ts';
import { DevicePairingDataCodec } from '../../core/api';
import { pipe } from 'fp-ts/lib/pipeable';
import * as Either from 'fp-ts/lib/Either';

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

export const PairingDataResponseCodec = t.type({
  id: t.string,
  ap_name: t.string,
  device_id: t.string,
  login_token: t.string,
  client_cert: t.string,
  client_key: t.string,
  server_cert: t.string,
  websocket_cert: t.union([t.string, t.undefined]),
  websocket_cert_der: t.union([t.string, t.undefined]),
  websocket_key: t.string
});

export const PairingDataCodec = t.intersection([
  DevicePairingDataCodec,
  t.type({
    id: t.string,
    deviceId: t.string,
    macAddress: t.string,
  })
]);

export type PairingData = t.TypeOf<typeof PairingDataCodec>;

export const PairingDataFromResponse = new t.Type<PairingData, t.TypeOf<typeof PairingDataResponseCodec>, unknown>(
  'PairingDataFromResponse',
  (u: unknown): u is PairingData => PairingDataCodec.is(u),
  (u: unknown, context: t.Context) =>
    pipe(
      PairingDataResponseCodec.validate(u, context),
      Either.map(res => ({
        id: res.id,
        apName: res.ap_name,
        deviceId: res.device_id,
        macAddress: res.device_id,
        loginToken: res.login_token,
        clientCert: res.client_cert,
        clientKey: res.client_key,
        serverCert: res.server_cert,
        websocketCert: res.websocket_cert,
        websocketCertDer: res.websocket_cert_der,
        websocketKey: res.websocket_key
      }))
    ),
   (a: PairingData) => ({
     id: a.id,
     ap_name: a.apName,
     device_id: a.macAddress,
     login_token: a.loginToken,
     client_cert: a.clientCert,
     client_key: a.clientKey,
     server_cert: a.serverCert,
     websocket_cert: a.websocketCert,
     websocket_cert_der: a.websocketCertDer,
     websocket_key: a.websocketKey
   })
);

export interface CompletePairingData {
  macAddress: string,
  timezone: string
};