import * as t from 'io-ts';

const InternalSystemModeCodec = t.partial({
  lastKnown: t.string,
});

const InternalValveStateCodec = t.partial({
  lastKnown: t.string,
});

const InternalConnectivityCodec = t.partial({
  rssi: t.number,
});

const InternalCurrentTelemetryCodec = t.type({
  gpm: t.number,
  psi: t.number,
  tempF: t.number,
  updated: t.string,
});

const InternalTelemetryCodec = t.partial({
  current: InternalCurrentTelemetryCodec,
});

const InternalDeviceCodec = t.type({
  connectivity: t.union([InternalConnectivityCodec, t.null, t.undefined]),
  createdTime: t.string,
  deviceId: t.string,
  floSense: t.union([t.record(t.string, t.any), t.null, t.undefined]),
  fwProperties: t.union([t.record(t.string, t.any), t.null, t.undefined]),
  fwVersion: t.string,
  isConnected: t.boolean,
  lastHeardFromTime: t.string,
  systemMode: t.union([InternalSystemModeCodec, t.null, t.undefined]),
  telemetry: t.union([InternalTelemetryCodec, t.null, t.undefined]),
  updatedTime: t.string,
  valveState: t.union([InternalValveStateCodec, t.null, t.undefined]),
});

type InternalDevice = t.TypeOf<typeof InternalDeviceCodec>;
type InternalSystemMode = t.TypeOf<typeof InternalSystemModeCodec>;
type InternalValveState = t.TypeOf<typeof InternalValveStateCodec>;
type InternalTelemetry = t.TypeOf<typeof InternalTelemetryCodec>;
type InternalConnectivity = t.TypeOf<typeof InternalConnectivityCodec>;

export {
  InternalDevice, InternalDeviceCodec, InternalSystemMode, InternalSystemModeCodec,
  InternalValveState, InternalValveStateCodec, InternalTelemetry, InternalTelemetryCodec,
  InternalConnectivity, InternalConnectivityCodec
};

