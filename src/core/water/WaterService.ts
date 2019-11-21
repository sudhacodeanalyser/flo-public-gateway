import { injectable, inject } from 'inversify';
import moment from 'moment-timezone';
import _ from 'lodash';
import { DeviceService, LocationService } from '../service';
import { DependencyFactoryFactory, WaterConsumptionItem, WaterConsumptionReport, WaterConsumptionInterval, WaterAveragesReport, WaterMetricsReport } from '../api';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { WaterMeterService, WaterMeterReport } from './WaterMeterService';

type InfluxRow = { time: Date, sum: number };
type AveragesResult = { 
  averageConsumption: number, 
  numRecords: number, 
  startDate: moment.Moment, 
  endDate?: moment.Moment
};

@injectable()
class WaterService {
  private static readonly MIN_DAY_OF_WEEK_AVG_NUM_HOURS = Math.floor(72 * 0.8); // Must be > 80% of 3 days of hourly data
  private static readonly MIN_WEEKLY_AVG_NUM_HOURS = Math.floor(168 * 0.8); // Must be > 80% of 7 days of hourly data
  private static readonly MIN_MONTHLY_AVG_NUM_DAYS = 28 * 24;
  private deviceServiceFactory: () => DeviceService;
  private locationServiceFactory: () => LocationService;

  constructor(
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('WaterMeterService') private waterMeterService: WaterMeterService
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
    this.locationServiceFactory = depFactoryFactory<LocationService>('LocationService');
  }

  public async getLocationConsumption(locationId: string, startDate: string, endDate: string = new Date().toISOString(), interval: WaterConsumptionInterval = WaterConsumptionInterval.ONE_HOUR, timezone?: string): Promise<WaterConsumptionReport> {
    const devices = await this.deviceServiceFactory().getAllByLocationId(locationId, {
      $select: {
        macAddress: true
      }
    });
    const tz = timezone || pipe(
      await this.locationServiceFactory().getLocation(locationId, {
        $select: {
          timezone: true
        }
      }),
      Option.fold(
        () => 'Etc/UTC',
        location => location.timezone || 'Etc/UTC'
      )
    );
    const start = this.formatDate(startDate, tz);
    const end = this.formatDate(endDate, tz);
    const macAddresses = devices.map(({ macAddress }) => macAddress);
    const results = await this.getWaterMeterReport(macAddresses, start, end, interval, tz);

    return this.formatConsumptionReport(start, end, interval, tz, results, locationId);
  }

  public async getDeviceConsumption(macAddress: string, startDate: string, endDate: string = new Date().toISOString(), interval: WaterConsumptionInterval = WaterConsumptionInterval.ONE_HOUR, timezone?: string): Promise<WaterConsumptionReport> {
    const tz = timezone || pipe(
      await this.deviceServiceFactory().getByMacAddress(macAddress, {
        $select: {
          location: {
            $select: {
              timezone: true
            }
          }
        }
      }),
      Option.fold(
        () => 'Etc/UTC',
        device => device.location.timezone || 'Etc/UTC'
      )
    );
    const start = this.formatDate(startDate, tz);
    const end = this.formatDate(endDate, tz);
    const results = await this.getWaterMeterReport([macAddress], start, end, interval, tz);

    return this.formatConsumptionReport(start, end, interval, tz, results, undefined, macAddress);
  }

  public async getDailyAverageConsumptionByLocationId(locationId: string, tz?: string): Promise<WaterAveragesReport> {
    const devices = await this.deviceServiceFactory().getAllByLocationId(locationId, {
      $select: {
        macAddress: true,
        location: {
          $select: {
            timezone: true
          }
        }
      }
    });
    const timezone = tz || _.get(devices[0], 'location.timezone', 'Etc/UTC');
    const now = moment.tz(timezone);
    const macAddresses = devices.map(({ macAddress }) => macAddress);
    const [
      dayOfTheWeekAverage,
      lastWeekDailyAverageConsumption,
      monthlyAverageConsumption
    ] = await Promise.all([
      this.getDayOfWeekAverageConsumption(macAddresses, timezone, now),
      this.getlastWeekDailyAverageConsumption(macAddresses, timezone, now),
      this.getMonthlyAverageConsumption(macAddresses, timezone, now)
    ]);

    return this.formatAveragesReport(
      dayOfTheWeekAverage,
      lastWeekDailyAverageConsumption,
      monthlyAverageConsumption,
      timezone,
      undefined,
      locationId
    );
  }

  public async getDailyAverageConsumptionByDevice(macAddress: string, tz?: string): Promise<WaterAveragesReport> {
    const device = await this.deviceServiceFactory().getByMacAddress(macAddress, {
      $select: {
        location: {
          $select: {
            timezone: true
          }
        }
      }
    });
    const timezone = tz || pipe(
      device,
      Option.fold(
        () => 'Etc/UTC',
        d => d.location.timezone || 'Etc/UTC'
      )
    );
    const now = moment.tz(timezone);
    const [
      dayOfTheWeekAverage,
      lastWeekDailyAverageConsumption,
      monthlyAverageConsumption
    ] = await Promise.all([
      pipe(
        device,
        Option.fold(
          async () => null as AveragesResult | null,
          async () => this.getDayOfWeekAverageConsumption([macAddress], timezone, now)
        )
      ),
      pipe(
        device,
        Option.fold(
          async () => null as AveragesResult | null,
          async () => this.getlastWeekDailyAverageConsumption([macAddress], timezone, now)
        )
      ),
      pipe(
        device,
        Option.fold(
          async () => null as AveragesResult | null,
          async () => this.getMonthlyAverageConsumption([macAddress], timezone, now)
        )
      )
    ]);

    return this.formatAveragesReport(
      dayOfTheWeekAverage,
      lastWeekDailyAverageConsumption,
      monthlyAverageConsumption,
      timezone,
      macAddress
    );
  }

  public async getMetricsAveragesByDevice(macAddress: string, startDate: string, endDate: string = new Date().toISOString(), interval: WaterConsumptionInterval = WaterConsumptionInterval.ONE_DAY, tz?: string): Promise<WaterMetricsReport> {
    const device = await this.deviceServiceFactory().getByMacAddress(macAddress, {
      $select: {
        location: {
          $expand: true,
          $select: {
            timezone: true
          }
        }
      }
    });
    const timezone = tz || pipe(
      device,
      Option.fold(
        () => 'Etc/UTC',
        d => d.location.timezone || 'Etc/UTC'
      )
    );
    const start = this.formatDate(startDate, tz);
    const end = this.formatDate(endDate, tz);
    const results = await this.getWaterMeterReport([macAddress], start, end, interval, timezone);
    const items = (results.items.length && results.items[0].items) || [];

    return {
      params: {
        tz: timezone,
        startDate: start,
        endDate: end,
        macAddress,
        interval
      },
      items: items.map(item => ({
        time: moment(item.date).tz(timezone).format(),
        averageGpm: item.rate,
        averagePsi: item.psi,
        averageTempF: item.temp
      }))
    };
  }

  private formatAveragesReport(
    dayOfTheWeekAverage: AveragesResult | null, 
    lastWeekDailyAverageConsumption: AveragesResult | null,
    monthlyAverageConsumption: AveragesResult | null,
    timezone: string, 
    macAddress?: string, 
    locationId?: string
  ): any {
   return {
     params: {
       macAddress,
       locationId,
       timezone
     },
     aggregations: {
        dayOfWeekAvg: dayOfTheWeekAverage === null || _.isEmpty(dayOfTheWeekAverage) || dayOfTheWeekAverage.numRecords < WaterService.MIN_DAY_OF_WEEK_AVG_NUM_HOURS ? 
          null : 
          {
            value: dayOfTheWeekAverage.averageConsumption,
            dayOfWeek: dayOfTheWeekAverage.startDate.day()
          },
        prevCalendarWeekDailyAvg: lastWeekDailyAverageConsumption === null || _.isEmpty(lastWeekDailyAverageConsumption) || lastWeekDailyAverageConsumption.numRecords < WaterService.MIN_WEEKLY_AVG_NUM_HOURS ? 
          null : 
          {
            value: lastWeekDailyAverageConsumption.averageConsumption,
            startDate: lastWeekDailyAverageConsumption.startDate.format(),
            endDate: lastWeekDailyAverageConsumption.endDate && lastWeekDailyAverageConsumption.endDate.format()
        },
        monthlyAvg: monthlyAverageConsumption === null || _.isEmpty(monthlyAverageConsumption) || monthlyAverageConsumption.numRecords < WaterService.MIN_MONTHLY_AVG_NUM_DAYS ?
          null :
          {
            value: monthlyAverageConsumption.averageConsumption,
            startDate: monthlyAverageConsumption.startDate.format(),
            endDate: monthlyAverageConsumption.endDate && monthlyAverageConsumption.endDate.format()
          }
      }
    };    
  }

  private aggregateAverageConsumptionResults(waterMeterReport: WaterMeterReport, dates: Array<{ startDate: string, endDate: string }>, timezone: string = 'Etc/UTC', interval: WaterConsumptionInterval = WaterConsumptionInterval.ONE_DAY): { averageConsumption: number, numRecords: number } {
    const aggregations = _.chain(waterMeterReport.items.map(deviceResults => deviceResults.items || []))
      .flatten()
      .filter(({ missing, date }) => 
        !missing && dates.some(({ startDate, endDate }) => date >= startDate && date < endDate)
      )
      .groupBy(({ date }) => 
        interval === WaterConsumptionInterval.ONE_HOUR ?
          moment(date).tz(timezone).format('YYYY-MM-DDTHH:00:00:00') :
          interval === WaterConsumptionInterval.ONE_DAY ?
            moment(date).tz(timezone).format('YYYY-MM-DD') :
            moment(date).tz(timezone).format('YYYY-MM')
      )
      .mapValues(day => ({
        sum: _.sumBy(day, 'used'),
        numRecords: day.length
      }))
      .values()
      .value();

    return {
      averageConsumption: _.meanBy(aggregations, 'sum'),
      numRecords: _.sumBy(aggregations, 'numRecords')
    };
  }

  private async getDayOfWeekAverageConsumption(macAddresses: string[], timezone: string, now: moment.Moment): Promise<AveragesResult> {
   
    if (!macAddresses.length) {
      return {
        averageConsumption: -1,
        numRecords: 0,
        startDate: now
      };
    }

    const dates = new Array(3).fill(null)
      .map((empty, i) => {
        const startDate = moment(now).tz(timezone).subtract(i + 1, 'weeks').startOf('day');
        const endDate = moment(startDate).tz(timezone).add(1, 'days');

        return {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        };
      });
    const startDate = _.get(_.minBy(dates, 'startDate'), 'startDate', now.toISOString());
    const endDate = _.get(_.maxBy(dates, 'endDate'), 'endDate', now.toISOString());
    const results = await this.waterMeterService.getReport(macAddresses, startDate, endDate, '1h', timezone);
    const stats =  this.aggregateAverageConsumptionResults(results, dates, timezone);

    return {
      startDate: now,
      ...stats
    };
  }

  private async getlastWeekDailyAverageConsumption(macAddresses: string[], timezone: string, now: moment.Moment): Promise<AveragesResult> {
   
    if (!macAddresses.length) {
      return {
        averageConsumption: -1,
        numRecords: 0,
        startDate: now
      };
    }

    const startDate = moment(now).tz(timezone).subtract(1, 'weeks').startOf('week').toISOString();
    const endDate = moment(startDate).tz(timezone).endOf('week').toISOString();
    const results = await this.waterMeterService.getReport(macAddresses, startDate, endDate, '1h', timezone);
    const stats = this.aggregateAverageConsumptionResults(results, [{ startDate, endDate }], timezone);

    return { 
     startDate: moment(startDate),
     endDate: moment(endDate),
      ...stats
    };
  }

  private async getMonthlyAverageConsumption(macAddresses: string[], timezone: string, now: moment.Moment): Promise<AveragesResult> {
    
    if (!macAddresses.length) {
      return {
        averageConsumption: -1,
        numRecords: 0,
        startDate: now
      };
    }

    const endDate = moment(now).tz(timezone).startOf('month').toISOString();
    const startDate = moment(now).tz(timezone).subtract(3, 'months').startOf('month').toISOString();
    const results = await this.waterMeterService.getReport(macAddresses, startDate, endDate, '1h', timezone);
    const stats = this.aggregateAverageConsumptionResults(results, [{ startDate, endDate }], timezone, WaterConsumptionInterval.ONE_MONTH);

    return {
      startDate: moment(startDate),
      endDate: moment(endDate),
      ...stats
    };
  }

  private formatConsumptionReport(startDate: string, endDate: string, interval: string, timezone: string, results: WaterMeterReport, locationId?: string, macAddress?: string): WaterConsumptionReport {
    const items = _.zip(...results.items.map(({ items: deviceItems }) => deviceItems || []))
      .map(data => 
        data.reduce(({ time, sum }, item) => ({
            time: time || (item && item.date),
            sum: sum + ((item && item.used) || 0)
          }), { sum: 0, time: undefined as undefined | string | Date }
        )
      );

    return {
      params: {
        startDate,
        endDate,
        interval,
        tz: timezone,
        locationId,
        macAddress
      },
      aggregations: {
        sumTotalGallonsConsumed: _.sumBy(items, 'sum')
      },
      items: items.map(({ time, sum }) => ({
        time: moment(time).tz(timezone).format(),
        gallonsConsumed: sum
      }))
    };
  }

  private formatDate(date: string, timezone: string = 'Etc/UTC'): string {
    return (hasUTCOffset(date) ? moment(date) : moment.tz(date, timezone)).toISOString();
  }

  private async getWaterMeterReport(macAddresses: string[], startDate: string, endDate: string, interval: WaterConsumptionInterval, timezone: string = 'Etc/UTC'): Promise<WaterMeterReport> {
    const results = await this.waterMeterService.getReport(macAddresses, startDate, endDate, '1h', timezone);
    const deviceResults = results.items
      .map(deviceItems => {
        const items = _.chain(deviceItems.items || [])
          .filter(({ date }) => {

            return date >= startDate && date < endDate;
          })
          .groupBy(({ date }) => 
            interval === WaterConsumptionInterval.ONE_HOUR ?
              moment(date).tz(timezone).format('YYYY-MM-DDTHH:00:00') :
              interval === WaterConsumptionInterval.ONE_DAY ?
                moment(date).tz(timezone).format('YYYY-MM-DD') :
                moment(date).tz(timezone).format('YYYY-MM')
          )
          .map((hours, aggregatedInterval) => {
            const nonMissingData = hours.filter(({ missing }) => !missing);

            return {
              date: moment.tz(aggregatedInterval, timezone).toISOString(),
              used: _.sumBy(hours, 'used'),
              psi: _.meanBy(hours, 'psi'),
              temp: _.meanBy(hours, 'temp'),
              rate: _.meanBy(hours, 'rate')
            };
          })
          .sortBy('date')
          .value();

          return {
            ...deviceItems,
            items
          };
      });

    return {
      ...results,
      items: deviceResults
    };
  }
}

function hasUTCOffset(date: string): boolean {
  return /T.+(Z|([-+](\d{2}:?(\d{2})?)))$/.test(date);
}

export { WaterService };