import { injectable, inject } from 'inversify';
import FloDetectEventChronologyTable from './FloDetectEventChronologyTable';
import { FloDetectEventChronologyRecord } from './FloDetectEventChronologyRecord';
import FloDetectResultTable from './FloDetectResultTable';
import { FloDetectResultRecord, FloDetectResultRecordData } from './FloDetectResultRecord';
import { Subscription, FloDetectEventPage, Device, DeviceType, DependencyFactoryFactory, FloDetectLearning, FloDetectComputation, FloDetectCompuationDuration, FloDetectEvent, FloDetectEventFeedback, FloDetectStatus } from '../api';
import * as Option from 'fp-ts/lib/Option';
import * as TaskEitherOption from '../../util/TaskEitherOption';
import { pipe } from 'fp-ts/lib/pipeable';
import moment from 'moment-timezone';
import { DeviceService, LocationService } from '../service';
import * as TaskOption from 'fp-ts-contrib/lib/TaskOption';
import { fromPartialRecord } from '../../database/Patch';
import { morphism, StrictSchema } from 'morphism';
import { FloDetectApi, FloDetectApiEventPage, FloDetectApiFlowEvent, FloDetectApiFixtures } from './FloDetectApi';
import _ from 'lodash';
import NotFoundError from '../api/error/NotFoundError';
import ForbiddenError from '../api/error/ForbiddenError';


interface FloDetectResponseFlowEvent {
  id: string;
  startAt: string;
  endAt: string;
  totalGal: string;
  predicted: {
    id: string;
    displayText: string;
  };
  feedback?: {
    id: number;
    displayText: string;
    user?: {
      id: string;
    }
  };
  incident?: {
    id: string;
  };
}

interface FloDetectResponseEventItem {
  macAddress: string;
  error?: string;
  events: FloDetectResponseFlowEvent[];
}

export interface FloDetectResponseEventPage {
  params: {
    macAddress?: string;
    locationId?: string;
    from: string;
    to: string;
    tz: string;
    minGallons: number;
  },
  items: FloDetectResponseEventItem[];
}

export interface FloDetectResponseFixtures {
  params: {
    macAddress?: string;
    locationId?: string;
    from: string;
    to: string;
    tz: string;
    minGallons: number;
  };
  items: Array<{
    macAddress: string;
    error?: string;
    fixtures: Array<{
      id: number;
      displayText: string;
      totalEvents: number;
      totalGallons: number;
      totalSeconds: number;
    }>
  }>
}


// Mappings ===================================


const ApiToResponseFlowEventSchema: StrictSchema<FloDetectResponseFlowEvent, FloDetectApiFlowEvent> = {
  id: 'id',
  startAt: 'startAt',
  endAt: 'endAt',
  totalGal: 'totalGal',
  predicted: {
    id: 'predictedId',
    displayText: 'predictedDisplayText'
  },
  feedback: (input: FloDetectApiFlowEvent) => {
    return input.feedbackId !== undefined ? 
      {
        id: input.feedbackId,
        displayText: input.feedbackDisplayText || '',
        user: input.feedbackUserId !== undefined ?
          { id: input.feedbackUserId } :
          undefined
      } : 
      undefined;
  },
  incident: (input: FloDetectApiFlowEvent) => {
    return input.incidentId !== undefined ?
      { id: input.incidentId } :
      undefined;
  }
}

const ApiToResponsePageSchema: StrictSchema<FloDetectResponseEventPage, FloDetectApiEventPage> = {
  params: {
    macAddress: () => undefined,
    locationId: () => undefined,
    from: 'params.from',
    to: 'params.to',
    tz: () => 'Etc/UTC',
    minGallons: 'params.minGallons'
  },
  items: (input: FloDetectApiEventPage) => {
    return input.items.map(apiItem => ({
      macAddress: apiItem.deviceId,
      error: apiItem.error,
      events: (apiItem.events || []).map(
        apiEvent => morphism(ApiToResponseFlowEventSchema, apiEvent)
      )
    }))
  }
}

const ApiToResponseFixtures: StrictSchema<FloDetectResponseFixtures, FloDetectApiFixtures> = {
  params: {
    macAddress: () => undefined,
    locationId: () => undefined,
    from: 'params.from',
    to: 'params.to',
    tz: () => 'Etc/UTC',
    minGallons: 'params.minGallons'
  },
  items: (input: FloDetectApiFixtures) => {
    return input.items.map(apiItem => ({
      macAddress: apiItem.deviceId,
      error: apiItem.error,
      fixtures: (apiItem.fixtures || []).map(fixture => ({
        id: fixture.id,
        displayText: fixture.displayText,
        totalGallons: fixture.totalGallons,
        totalEvents: fixture.count,
        totalSeconds: fixture.totalSeconds
      }))
    }));
  }
};

// ============================================

@injectable()
class FloDetectService {
  private deviceServiceFactory: () => DeviceService;
  private locationServiceFactory: () => LocationService;

  constructor(
    @inject('FloDetectResultTable') private floDetectResultTable: FloDetectResultTable,
    @inject('FloDetectEventChronologyTable') private floDetectEventChronologyTable: FloDetectEventChronologyTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('FloDetectApi') private floDetectApi: FloDetectApi
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
    this.locationServiceFactory = depFactoryFactory<LocationService>('LocationService');
  }

  // FloDetect V1 
  public async getLatestComputation(macAddress: string, duration: FloDetectCompuationDuration): Promise<Option.Option<FloDetectComputation | FloDetectLearning>> {
    const durationInSeconds = duration === FloDetectCompuationDuration.TWENTY_FOUR_HOURS ?
     86400 :
     604800;

    return pipe(
      TaskEitherOption.fromOption<FloDetectLearning, Device>(await this.deviceServiceFactory().getByMacAddress(macAddress, {
        $select: {
          installStatus: true
        }
      })),
      TaskEitherOption.chain(device => {
        if (
          !device.installStatus.isInstalled || 
          !device.installStatus.installDate ||
          device.installStatus.installDate > moment().subtract(21, 'days').toISOString()
        ) {
          return TaskEitherOption.left({ 
            macAddress, 
            status: FloDetectStatus.LEARNING
          });
        } else {
          return TaskEitherOption.fromTaskOption(() => 
            this.floDetectResultTable.retrieveLatestByMacAddress(macAddress, durationInSeconds)
           );
        }            
      }),
      TaskEitherOption.map(floDetectResultRecord => {
        const floDetectComputation = FloDetectResultRecord.toModel(floDetectResultRecord);
        const cutOff = duration === FloDetectCompuationDuration.TWENTY_FOUR_HOURS ?
          moment().subtract(2, 'hours').startOf('hour').toISOString() :
          moment().subtract(36, 'hours').startOf('hour').toISOString();

        if (floDetectResultRecord.end_date >= cutOff) {
          return floDetectComputation;
        } else {
          return {
            ...floDetectComputation,
            isStale: true
          };
        }
      }),
      TaskEitherOption.fold(
        learning => async () => Option.some(learning as FloDetectLearning | FloDetectComputation),
        () => async () => Option.none,
        floDetectComputation => async () => Option.some(floDetectComputation)
       )
    )();
  }

  // FloDetect V1 
  public async getEventChronologyPage(macAddress: string, computationId: string, startDate?: string, pageSize?: number, isDescending?: boolean): Promise<FloDetectEventPage> {
    const eventChronologyPage = await this.floDetectEventChronologyTable.retrieveAfterStartDate(
      macAddress,
      computationId,
      startDate || (isDescending ? new Date().toISOString() : new Date(0).toISOString()),
      pageSize,
      isDescending
    );

    return {
      items: eventChronologyPage.map(eventChronologyRecord => FloDetectEventChronologyRecord.toModel(eventChronologyRecord))
    };
  }

  // FloDetect V1 
  public async submitEventFeedback(macAddress: string, computationId: string, startDate: string, feedback: FloDetectEventFeedback): Promise<FloDetectEvent> {
    const eventRecordData = FloDetectEventChronologyRecord.convertFeedbackToPartialRecord(feedback);
    const patch = fromPartialRecord(eventRecordData);
    const updatedEventRecordData = await this.floDetectEventChronologyTable.update(
      this.floDetectEventChronologyTable.composeKeys(
        macAddress,
        computationId,
        startDate
      ), 
      patch
    );

    return FloDetectEventChronologyRecord.toModel(updatedEventRecordData);
  } 

  // FloDetect V1 
  public async getComputationById(computationId: string): Promise<Option.Option<FloDetectComputation>> {

    return pipe(
      await this.floDetectResultTable.getByComputationId(computationId),
      Option.map(result => FloDetectResultRecord.toModel(result))
    );
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
  }): Promise<FloDetectResponseEventPage> {
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
    const result = await this.floDetectApi.getEvents(macAddresses, { from: fromDate, to: toDate, limit, offset, lang });
    const rawResponse = morphism(ApiToResponsePageSchema, result);

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
    const result = await this.floDetectApi.getFixtures(macAddresses, { from: fromDate, to: toDate, lang });
    const rawResponse = morphism(ApiToResponseFixtures, result);

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