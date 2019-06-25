import * as t from 'io-ts';
import { ComputedIrrigationSchedule, DeviceIrrigationAllowedState, ComputationStatusCodec, ComputationStatus } from '../../core/device/IrrigationScheduleService';

const ComputedIrrigationScheduleResponseCodec = t.type({
  device_id: t.string,
  status: ComputationStatusCodec,
  times: t.union([t.undefined, t.array(t.array(t.string))])
});

export const ComputedIrrigationScheduleCodec = new t.Type<ComputedIrrigationSchedule, t.TypeOf<typeof ComputedIrrigationScheduleResponseCodec>, unknown>(
  'ComputedIrrigationSchedule',
  (u: unknown): u is ComputedIrrigationSchedule => true,
  (u: unknown, context: t.Context) => {
    return ComputedIrrigationScheduleResponseCodec.validate(u, context)
      .map(computedIrrigationScheduleResponse => ({
        status: computedIrrigationScheduleResponse.status,
        times: computedIrrigationScheduleResponse.times,
        macAddress: computedIrrigationScheduleResponse.device_id
      }))
  },
  (a: ComputedIrrigationSchedule) => ({
    status: a.status,
    device_id: a.macAddress,
    times: a.times
  })
);

const DeviceIrrigationAllowedStateResponse = t.type({
  icd_id: t.string,
  created_at: t.union([t.undefined, t.string]),
  is_enabled: t.boolean,
  times: t.union([t.undefined, t.array(t.array(t.string))])
});

export const DeviceIrrigationAllowedStateCodec = new t.Type<DeviceIrrigationAllowedState, t.TypeOf<typeof DeviceIrrigationAllowedStateResponse>, unknown>(
  'DeviceIrrigationAllowedState',
  (u: unknown): u is DeviceIrrigationAllowedState => true,
  (u: unknown, context: t.Context) => {
    return DeviceIrrigationAllowedStateResponse.validate(u, context)
      .map(deviceIrrigationAllowedStateResponse => ({
        id: deviceIrrigationAllowedStateResponse.icd_id,
        updatedAt: deviceIrrigationAllowedStateResponse.created_at || new Date().toISOString(),
        isEnabled: deviceIrrigationAllowedStateResponse.is_enabled,
        times: deviceIrrigationAllowedStateResponse.times
      }))
  },
  (a: DeviceIrrigationAllowedState) => ({
    icd_id: a.id,
    created_at: a.updatedAt,
    is_enabled: a.isEnabled,
    times: a.times
  })
);