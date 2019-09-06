import * as t from 'io-ts';

export const TelemetryCodec = t.type({
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

export type Telemetry = t.TypeOf<typeof TelemetryCodec>;