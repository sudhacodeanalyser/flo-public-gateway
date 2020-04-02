import * as t from 'io-ts';
import { convertEnumtoCodec } from '../api/enumUtils';
import Request from '../api/Request';

export enum ComputationStatus {
  SCHEDULE_FOUND = 'schedule_found',
  SCHEDULE_NOT_FOUND = 'schedule_not_found',
  NO_IRRIGATION = 'no_irrigation_in_home',
  LEARNING = 'learning',
  ERROR = 'internal_error'
}

export const ComputationStatusCodec = convertEnumtoCodec(ComputationStatus);

export const ComputedIrrigationScheduleCodec = t.type({
  status: ComputationStatusCodec,
  times: t.union([t.undefined, t.array(t.array(t.string))]),
  macAddress: t.string
})

export type ComputedIrrigationSchedule = t.TypeOf<typeof ComputedIrrigationScheduleCodec>;

export const DeviceIrrigationAllowedStateCodec = t.type({
  id: t.string,
  updatedAt: t.string,
  isEnabled: t.boolean,
  times: t.union([t.undefined, t.array(t.array(t.string))])
});

export type DeviceIrrigationAllowedState = t.TypeOf<typeof DeviceIrrigationAllowedStateCodec>;


export interface IrrigationScheduleService {
  getDeviceComputedIrrigationSchedule(id: string): Promise<ComputedIrrigationSchedule>;
  enableDeviceIrrigationAllowedInAwayMode(id: string, times: string[][]): Promise<void>;
  disableDeviceIrrigationAllowedInAwayMode(id: string): Promise<void>;
  getDeviceIrrigationAllowedState(id: string): Promise<DeviceIrrigationAllowedState>;
}