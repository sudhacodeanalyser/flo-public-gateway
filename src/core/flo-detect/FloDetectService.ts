import { injectable, inject } from 'inversify';
import {
  PropExpand,
  Subscription, 
  Device, 
  DeviceType, 
  DependencyFactoryFactory, 
  FloDetectResponseFlowEvent,
  FloDetectResponseEventItem,
  FloDetectResponseEventPage,
  FloDetectResponseFixtures
} from '../api';
import * as Option from 'fp-ts/lib/Option';
import * as TaskEitherOption from '../../util/TaskEitherOption';
import { pipe } from 'fp-ts/lib/pipeable';
import moment from 'moment-timezone';
import { DeviceService, LocationService } from '../service';
import * as TaskOption from 'fp-ts-contrib/lib/TaskOption';
import { fromPartialRecord } from '../../database/Patch';
import { morphism, StrictSchema } from 'morphism';
import { FloDetectApi, FloDetectApiEventPage, FloDetectApiFlowEvent, FloDetectApiEventItem, FloDetectApiFixtures } from './FloDetectApi';
import _ from 'lodash';
import NotFoundError from '../api/error/NotFoundError';
import ForbiddenError from '../api/error/ForbiddenError';
import { FloDetectResolver } from '../resolver';

@injectable()
class FloDetectService {
  private deviceServiceFactory: () => DeviceService;
  private locationServiceFactory: () => LocationService;

  constructor(
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('FloDetectApi') private floDetectApi: FloDetectApi,
    @inject('FloDetectResolver') private floDetectResolver: FloDetectResolver
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
    this.locationServiceFactory = depFactoryFactory<LocationService>('LocationService');
  }

  // FloDetect V2
  public async getEvents(
    idData: ({ macAddress: string } | { locationId: string }),
    { from, to, limit, offset, tz, lang }: {
      from?: string,
      to?: string,
      limit?: number,
      offset?: number,
      tz?: string
      lang?: string
    },
    expand?: PropExpand
  ): Promise<FloDetectResponseEventPage> {
    const data = await (isMacAddress(idData) ?
      this.getLocationDataByMacAddress(idData.macAddress) :
      this.getLocationDataByLocationId(idData.locationId));

    if (!data) {
      throw new NotFoundError(isMacAddress(idData) ? 'Device not found.' : 'Location not found.');
    } else if (!data.hasActiveSubscription) {
      throw new ForbiddenError('FloDetect subscription required.');
    }

    const { macAddresses, timezone: locationTimezone } = data;
    const timezone = tz || locationTimezone;
    const fromDate = from && !_.isEmpty(from) ?
      hasUTCOffset(from) ? new Date(from) : moment.tz(from, tz || data.timezone || 'Etc/UTC').toDate() :
      undefined;
    const toDate = to && !_.isEmpty(to) ?
      hasUTCOffset(to) ? new Date(to) : moment.tz(to, tz || data.timezone || 'Etc/UTC').toDate() :
      undefined; 
    const rawResponse = await this.floDetectResolver.getEvents(macAddresses, { from: fromDate, to: toDate, limit, offset, lang }, expand);

    return {
      params: {
        ...rawResponse.params,
        ...idData,
        tz: timezone
      },
      items: rawResponse.items
        .map(deviceData => {
          return {
            ...deviceData,
            events: deviceData.events.map(event => ({
              ...event,
              startAt: moment(event.startAt).tz(timezone).format(),
              endAt: moment(event.endAt).tz(timezone).format()
            }))
          }
        })
    };
  }

  // FloDetect V2
  public async getFixtures(
    idData: ({ macAddress: string } | { locationId: string }),
    { from, to, tz, lang }: {
      from?: string,
      to?: string,
      tz?: string
      lang?: string
  }): Promise<FloDetectResponseFixtures> {
    const data = await (isMacAddress(idData) ?
      this.getLocationDataByMacAddress(idData.macAddress) :
      this.getLocationDataByLocationId(idData.locationId));

    if (!data) {
      throw new NotFoundError(isMacAddress(idData) ? 'Device not found.' : 'Location not found.');
    } else if (!data.hasActiveSubscription) {
      throw new ForbiddenError('FloDetect subscription required.');
    }

    const { macAddresses, timezone: locationTimezone } = data;
    const timezone = tz || locationTimezone;
    const fromDate = from && !_.isEmpty(from) ?
      hasUTCOffset(from) ? new Date(from) : moment.tz(from, tz || data.timezone || 'Etc/UTC').toDate() :
      undefined;
    const toDate = to && !_.isEmpty(to) ?
      hasUTCOffset(to) ? new Date(to) : moment.tz(to, tz || data.timezone || 'Etc/UTC').toDate() :
      undefined; 
    const rawResponse = await this.floDetectResolver.getFixtures(macAddresses, { from: fromDate, to: toDate, lang });

    return {
      ...rawResponse,
      params: {
        ...rawResponse.params,
        ...idData,
        tz: timezone
      }
    };
  }

  public async submitEventFeedbackV2(eventId: string, feedbackId: number, userId?: string): Promise<void> {
    return this.floDetectApi.submitFeedback(eventId, feedbackId, userId);
  }

  public async getEventById(eventId: string, expand?: PropExpand): Promise<FloDetectResponseFlowEvent> {

    return this.floDetectResolver.getEventById(eventId, expand);
  }

  private async getLocationDataByMacAddress(macAddress: string): Promise<{ locationId: string, timezone: string, macAddresses: string[], hasActiveSubscription: boolean } | null> {
    const device = await this.deviceServiceFactory().getByMacAddress(macAddress, {
      $select: {
        location: {
          $select: {
            id: true,
            timezone: true,
            subscription: {
              $select: {
                provider: {
                  $select: {
                    isActive: true,
                    data: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (Option.isNone(device)) {
      return null;
    }

    const subscription = device.value.location.subscription as Subscription;
    const hasActiveSubscription = !!subscription && subscription.provider.isActive;

    return { 
      locationId: device.value.location.id, 
      timezone: device.value.location.timezone || 'Etc/Utc', 
      macAddresses: [macAddress],
      hasActiveSubscription
    };
  }

  private async getLocationDataByLocationId(locationId: string): Promise<{ locationId: string, timezone: string, macAddresses: string[], hasActiveSubscription: boolean } | null> {
    const location = await this.locationServiceFactory().getLocation(locationId, {
      $select: {
        id: true,
        timezone: true,
        devices: {
          $select: {
            id: true,
            macAddress: true,
            deviceType: true
          }
        },
        subscription: {
          $select: {
            provider: {
              $select: {
                isActive: true,
                data: true
              }
            }
          }
        }
      }
    });

    if (Option.isNone(location)) {
      return null;
    }

    const macAddresses = (location.value.devices as Device[])
      .filter(({ deviceType }) => deviceType !== DeviceType.PUCK) 
      .map(({ macAddress }) => macAddress);
    const subscription = location.value.subscription as Subscription;
    const hasActiveSubscription = !!subscription && subscription.provider.isActive;

    return { 
      locationId: location.value.id, 
      timezone: location.value.timezone || 'Etc/Utc', 
      macAddresses,
      hasActiveSubscription
    };
  }
}

function isMacAddress(data: any): data is { macAddress: string } {

  return data.macAddress;
}

function hasUTCOffset(date: string): boolean {
  return /T.+(Z|([-+](\d{2}:?(\d{2})?)))$/.test(date);
}

export { FloDetectService };