import { convertEnumtoCodec } from '../api/enumUtils';
import Request from '../api/Request';
import * as t from 'io-ts';

export enum SystemMode {
  HOME = 2,
  AWAY = 3,
  SLEEP = 5
}

export const SystemModeCodec = t.union([
  t.literal(2),
  t.literal(3),
  t.literal(5)
]);

export interface DeviceSystemModeServiceFactory {
  create(req: Request): DeviceSystemModeService; 
}

export interface DeviceSystemModeService {
  setSystemMode(id: string, systemMode: SystemMode): Promise<void>;
  sleep(id: string, sleepMinutes: number, wakeUpSystemMode: SystemMode): Promise<void>;
  enableForcedSleep(id: string): Promise<void>;
  disableForcedSleep(id: string): Promise<void>;
}