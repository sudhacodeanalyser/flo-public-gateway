import * as t from 'io-ts';
import { ComputedIrrigationSchedule, ComputedIrrigationScheduleCodec, DeviceIrrigationAllowedState, DeviceIrrigationAllowedStateCodec, ComputationStatusCodec, ComputationStatus } from '../../core/device/IrrigationScheduleService';
import * as _ from 'lodash';
import { either } from 'fp-ts/lib/Either';

const ComputedIrrigationScheduleResponseCodec = t.type({
  device_id: t.string,
  status: ComputationStatusCodec,
  times: t.union([t.undefined, t.null, t.array(t.array(t.string))])
});

export const ResponseToComputedIrrigationSchedule = new t.Type<ComputedIrrigationSchedule, t.TypeOf<typeof ComputedIrrigationScheduleResponseCodec>, unknown>(
  'ComputedIrrigationSchedule',
  (u: unknown): u is ComputedIrrigationSchedule => ComputedIrrigationScheduleCodec.is(u),
  (u: unknown, context: t.Context) => {
    return either.map(ComputedIrrigationScheduleResponseCodec.validate(u, context), (computedIrrigationScheduleResponse => ({
        status: computedIrrigationScheduleResponse.status,
        times: computedIrrigationScheduleResponse.times || undefined,
        macAddress: computedIrrigationScheduleResponse.device_id
      })));
  },
  (a: ComputedIrrigationSchedule) => ({
    status: a.status,
    device_id: a.macAddress,
    times: a.times
  })
);

const DeviceIrrigationAllowedStateResponse = t.type({
  icd_id: t.string,
  created_at: t.union([t.undefined, t.null, t.string]),
  is_enabled: t.boolean,
  times: t.union([t.undefined, t.null, t.array(t.array(t.string))])
});

export const ResponseToDeviceIrrigationAllowedState = new t.Type<DeviceIrrigationAllowedState, t.TypeOf<typeof DeviceIrrigationAllowedStateResponse>, unknown>(
  'DeviceIrrigationAllowedState',
  (u: unknown): u is DeviceIrrigationAllowedState => true,
  (u: unknown, context: t.Context) => {
    const validation = DeviceIrrigationAllowedStateResponse.validate(u, context);
    
    return either
      .map(validation, deviceIrrigationAllowedStateResponse => ({
        id: deviceIrrigationAllowedStateResponse.icd_id,
        updatedAt: deviceIrrigationAllowedStateResponse.created_at || new Date().toISOString(),
        isEnabled: deviceIrrigationAllowedStateResponse.is_enabled,
        times: deviceIrrigationAllowedStateResponse.times || undefined
      }))
  },
  (a: DeviceIrrigationAllowedState) => ({
    icd_id: a.id,
    created_at: a.updatedAt,
    is_enabled: a.isEnabled,
    times: a.times
  })
);