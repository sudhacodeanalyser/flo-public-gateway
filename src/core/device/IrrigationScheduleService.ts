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

export interface ComputedIrrigationSchedule {
  status: ComputationStatus;
  times?: string[][];
  macAddress: string;
}

export interface DeviceIrrigationAllowedState {
  id: string;
  updatedAt: string;
  isEnabled: boolean;
  times?: string[][];
}

export interface IrrigationScheduleService {
  getDeviceComputedIrrigationSchedule(id: string): Promise<ComputedIrrigationSchedule>;
  enableDeviceIrrigationAllowedInAwayMode(id: string, times: string[][]): Promise<void>;
  disableDeviceIrrigationAllowedInAwayMode(id: string): Promise<void>;
  getDeviceIrrigationAllowedState(id: string): Promise<DeviceIrrigationAllowedState>;
}

export interface IrrigationScheduleServiceFactory {
  create(req: Request): IrrigationScheduleService;
}