import * as t from 'io-ts';

export const DeviceTelemetryDataCodec = t.type({
  did: t.string,
  wf: t.number,
  f: t.number,
  t: t.number,
  p: t.number,
  ts: t.number,
  sw1: t.union([t.literal(0), t.literal(1)]),
  sw2: t.union([t.literal(0), t.literal(1)]),
  v: t.union([t.literal(0), t.literal(1), t.literal(-1)]),
  rssi: t.number
});

export const PuckTelemetryCodec = t.type({
  deviceId: t.string,
  data: t.record(t.string, t.any) // TODO: PUCK. Telemetry structure is TBD at the time of writing this.
})

export const DeviceTelemetryCodec = t.type({
  deviceId: t.string,
  items: t.array(DeviceTelemetryDataCodec)
})

export type DeviceTelemetryData = t.TypeOf<typeof DeviceTelemetryDataCodec>;

export type DeviceTelemetry = t.TypeOf<typeof DeviceTelemetryCodec>;

export type PuckTelemetry = t.TypeOf<typeof PuckTelemetryCodec>;

export type Telemetry = DeviceTelemetry | PuckTelemetry;

// Telemetry Tags
export interface TagDetail {
  source: string;
  type: string;
}

export interface TagCreate extends TagDetail {
  start: string;
  end: string;
}

export interface Tag extends TagCreate {
  id: string;
  created: string;
  status: string;
}

export interface Tags {
  items: Tag[];
}

export interface TagFilter {
  start?: string;
  end?: string;
}