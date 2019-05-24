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

export const PairingDataCodec = t.type({
  id: t.string,
  ap_name: t.string,
  ap_password: t.union([t.string, t.undefined]),
  device_id: t.string,
  login_token: t.string,
  client_cert: t.string,
  client_key: t.string,
  server_cert: t.string,
  websocket_cert: t.union([t.string, t.undefined]),
  websocket_cert_der: t.union([t.string, t.undefined]),
  websocket_key: t.string
})

export type PairingData = t.TypeOf<typeof PairingDataCodec>;

export interface CompletePairingData {
  macAddress: string,
  timezone: string
};