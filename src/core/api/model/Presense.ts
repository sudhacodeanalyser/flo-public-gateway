import * as t from 'io-ts';
import {Expandable, TimestampedModel, Location, DeviceUpdate, DeviceType, DeviceModelType} from '../../api';


export interface PresenseData {
    action: string,
    userId: string,
    accountId: string,
    deviceId: string[],
    appName: string,
    appVersion: string,
    type: string,
    date: string,
    ipAddress: string,
    ttl: number
}
