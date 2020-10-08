import * as t from 'io-ts';
import { convertEnumtoCodec } from '../core/api/enumUtils';

export enum ValveState {
  OPEN = 'open',
  CLOSED = 'closed'
}

const ValveStateCodec = convertEnumtoCodec(ValveState);

const ValveStateMetaCodec = t.type({
  target: ValveStateCodec,
  cause: t.type({
    type: t.string,
    source: t.union([t.undefined, t.type({
      id: t.string,
      type: t.string,
      name: t.union([t.undefined, t.string])
    })])
  })
});

const InternalSystemModeCodec = t.partial({
  lastKnown: t.string,
});

const InternalValveStateCodec = t.partial({
  lastKnown: t.string,
});

const InternalConnectivityCodec = t.partial({
  rssi: t.number,
  ssid: t.string,
});

const InternalDeviceCurrentTelemetryCodec = t.type({
  gpm: t.number,
  psi: t.number,
  tempF: t.number,
  updated: t.string,
});

const InternalPuckCurrentTelemetryCodec = t.type({
  tempF: t.union([t.null, t.undefined, t.number]),
  humidity: t.union([t.null, t.undefined, t.number]),
  updated: t.string,
});

const InternalCurrentTelemetryCodec = t.union([
  InternalDeviceCurrentTelemetryCodec,
  InternalPuckCurrentTelemetryCodec
]);

const InternalTelemetryCodec = t.partial({
  current: InternalCurrentTelemetryCodec,
});

// If the additional property (which is going to be exposed to the clients in the API response) has to be added to the
// InternalDeviceCodec, make sure to update AdditionalDevicePropsCodec in /src/core/api/model/Device.ts accordingly
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
  valveStateMeta: t.union([ValveStateMetaCodec, t.null, t.undefined]),
  hwThresholds: t.union([t.record(t.string, t.any), t.null, t.undefined]),
  audio: t.union([t.undefined, t.null, t.type({
    snoozeTo: t.string,
    snoozeSeconds: t.number
  })]),
  latestFwInfo: t.union([t.type({
    version: t.string,
    sourceType: t.string,
    sourceLocation: t.string
  }), t.undefined]),
  componentHealth: t.union([
    t.undefined,
    t.record(t.string, t.any)
  ]),
  fwPropertiesUpdateReq: t.union([
    t.type({
      meta: t.union([t.undefined, t.null, t.record(t.string, t.any)]),
      fwProperties: t.union([t.undefined, t.null, t.record(t.string, t.any)])
    }), 
    t.null, 
    t.undefined
  ])
});

interface InternalDevice extends t.TypeOf<typeof InternalDeviceCodec> {
  lastKnownFwProperties?: null | Record<string, any>;
}
type InternalSystemMode = t.TypeOf<typeof InternalSystemModeCodec>;
type InternalValveState = t.TypeOf<typeof InternalValveStateCodec>;
type InternalTelemetry = t.TypeOf<typeof InternalTelemetryCodec>;
type InternalConnectivity = t.TypeOf<typeof InternalConnectivityCodec>;

export {
  InternalDevice, InternalDeviceCodec, InternalSystemMode, InternalSystemModeCodec,
  InternalValveState, InternalValveStateCodec, InternalTelemetry, InternalTelemetryCodec,
  InternalConnectivity, InternalConnectivityCodec
};
