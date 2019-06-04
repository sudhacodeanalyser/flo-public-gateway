import { convertEnumtoCodec } from '../api/enumUtils';
import Request from '../api/Request';
import * as t from 'io-ts';

export enum SystemMode {
  HOME = 'home',
  AWAY = 'away',
  SLEEP = 'sleep'
}

export const SystemModeCodec = convertEnumtoCodec(SystemMode);

export interface DeviceSystemModeServiceFactory {
  create(req: Request): DeviceSystemModeService; 
}

export interface DeviceSystemModeService {
  setSystemMode(id: string, systemMode: SystemMode): Promise<void>;
  sleep(id: string, sleepMinutes: number, wakeUpSystemMode: SystemMode): Promise<void>;
  enableForcedSleep(id: string): Promise<void>;
  disableForcedSleep(id: string): Promise<void>;
}