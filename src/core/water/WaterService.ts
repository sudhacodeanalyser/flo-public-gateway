import { injectable, inject } from 'inversify';
import { InfluxDB, IResults } from 'influx';
import moment from 'moment-timezone';
import _ from 'lodash';
import { DeviceService, LocationService } from '../service';
import { DependencyFactoryFactory, WaterConsumptionItem, WaterConsumptionReport, WaterConsumptionInterval, WaterAveragesReport } from '../api';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

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
    @inject('InfluxDB') private influxClient: InfluxDB,
    @inject('InfluxAnalyticsDb') private influxAnalyticsDb: string,
    @inject('InfluxTelemetryDb') private influxTelemetryDb: string,
    @inject('InfluxHourlyMeasurement') private influxHourlyMeasurement: string,
    @inject('InfluxSecondMeasurement') private influxSecondMeasurement: string,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
    this.locationServiceFactory = depFactoryFactory<LocationService>('LocationService');
  }

  public async getLocationConsumption(locationId: string, startDate: string, endDate: string = new Date().toISOString(), interval: string = WaterConsumptionInterval.ONE_HOUR, timezone?: string): Promise<WaterConsumptionReport> {
    const devices = await this.deviceServiceFactory().getAllByLocationId(locationId);
    const tz = timezone || pipe(
      await this.locationServiceFactory().getLocation(locationId),
      Option.fold(
        () => 'Etc/UTC',
        location => location.timezone || 'Etc/UTC'
      )
    );
    const start = this.formatDate(startDate, tz);
    const end = this.formatDate(endDate, tz);
    const devicesConsumption = await Promise.all(
      devices.map(({ macAddress }) => this.queryDeviceConsumption(macAddress, start, end, tz))
    );
    const results = _.zipWith(
      ...devicesConsumption, 
      (...hours: InfluxRow[]) => 
       hours.reduce(
         (acc, { sum }) => ({ ...acc, sum: sum + acc.sum }),
         { ...hours[0], sum: 0 }
       )
    );

    return this.formatReport(start, end, interval, tz, results, locationId);
  }

  public async getDeviceConsumption(macAddress: string, startDate: string, endDate: string = new Date().toISOString(), interval: string = WaterConsumptionInterval.ONE_HOUR, timezone?: string): Promise<WaterConsumptionReport> {
    const tz = timezone || pipe(
      await this.deviceServiceFactory().getByMacAddress(macAddress, ['location']),
      Option.fold(
        () => 'Etc/UTC',
        device => device.location.timezone || 'Etc/UTC'
      )
    );
    const start = this.formatDate(startDate, tz);
    const end = this.formatDate(endDate, tz);
    const results = await this.queryDeviceConsumption(macAddress, start, end, tz);

    return this.formatReport(start, end, interval, tz, results, undefined, macAddress);
  }

  public async getDailyAverageConsumptionByLocationId(locationId: string, tz?: string): Promise<WaterAveragesReport> {
    const devices = await this.deviceServiceFactory().getAllByLocationId(locationId, ['location']);
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
    const device = await this.deviceServiceFactory().getByMacAddress(macAddress, ['location']);
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
        fourWeekAvg: monthlyAverageConsumption === null || _.isEmpty(monthlyAverageConsumption) || monthlyAverageConsumption.numRecords < WaterService.MIN_MONTHLY_AVG_NUM_DAYS ?
          null :
          {
            value: monthlyAverageConsumption.averageConsumption,
            startDate: monthlyAverageConsumption.startDate.format(),
            endDate: monthlyAverageConsumption.endDate && monthlyAverageConsumption.endDate.format()
          }
      }
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
        const startDate = moment(now).subtract(i + 1, 'weeks').startOf('day');
        const endDate = moment(startDate).add(1, 'days');

        return {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        };
      });
    const query = this.formatAveragesQuery(macAddresses, 'total_flow', this.influxHourlyMeasurement, dates, timezone);
    const results = await this.influxClient.query<AveragesResult>(query, { database: this.influxAnalyticsDb });

    return {
      startDate: now,
      ...results[0]
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

    const startDate = moment(now).subtract(1, 'weeks').startOf('week');
    const endDate = moment(startDate).endOf('week');
    const query = this.formatAveragesQuery(macAddresses, 'total_flow', this.influxHourlyMeasurement, [{ startDate: startDate.toISOString(), endDate: endDate.toISOString() }], timezone);
    const results = await this.influxClient.query<AveragesResult>(query, { database: this.influxAnalyticsDb });

    return { 
      startDate,
      endDate,
      ...results[0]
    };
  }

  private async getMonthlyAverageConsumption(macAddresses: string[], timezone: string, now: moment.Moment): Promise<AveragesResult> {
    const endDate = moment(now).startOf('month');
    const startDate = moment(now).subtract(3, 'months').startOf('month');
    const query = this.formatAveragesQuery(
      macAddresses,
      'total_flow',
      this.influxHourlyMeasurement,
      [{ startDate: startDate.toISOString(), endDate: endDate.toISOString() }],
      timezone,
      '4w' // Influx does not support a calendar month interval
    );
    const results = await this.influxClient.query<AveragesResult>(query, { database: this.influxAnalyticsDb });

    return {
      startDate,
      endDate,
      ...results[0]
    };
  }

  private formatQuery(macAddress: string, column: string, measurement: string, startDate: string, endDate: string, timezone: string): string {

    if (endDate < startDate) {
      throw new Error('Invalid date range');
    }

    const start = (hasUTCOffset(startDate) ? moment(startDate) : moment.tz(startDate, timezone)).toISOString();
    const end = (hasUTCOffset(endDate) ? moment(endDate) : moment.tz(endDate, timezone)).toISOString();

    return `
      SELECT sum(${ column }) FROM ${ measurement }
      WHERE did::tag = '${ macAddress }'
      AND time >= '${ start }'
      AND time < '${ end }'
      GROUP BY time(1h) fill(0) tz('${ timezone }')
    `.replace(/\s+/g, ' ');
  }

  private formatAveragesQuery(macAddresses: string[], column: string, measurement: string, ranges: Array<{ startDate: string, endDate: string }>, timezone: string, interval: string = '1d'): string {
    const devices = macAddresses.map(macAddress => `did::tag = '${ macAddress }'`).join(' OR ');
    const dateSubQueries = ranges
      .map(({ startDate, endDate }) => {
        
        if (endDate < startDate) {
          throw new Error('Invalid date range');
        }

        return `(
          SELECT sum(${ column }) as gallonsConsumed, count(${ column }) as numRecords FROM ${ measurement }
          WHERE (${ devices })
          AND time >= '${ startDate }' 
          AND time < '${ endDate }'
          GROUP BY time(${ interval }) fill(none) tz('${ timezone }')
        )`;
      })
      .reverse()
      .join(', ');

    return `
      SELECT mean(gallonsConsumed) as averageConsumption, sum(numRecords) as numRecords FROM
      ${ dateSubQueries }
    `.replace(/\s+/g, ' ');    
  }

  private formatReport(startDate: string, endDate: string, interval: string, timezone: string, results: InfluxRow[], locationId?: string, macAddress?: string): WaterConsumptionReport {
    const items = interval === WaterConsumptionInterval.ONE_HOUR ? 
      results :
      _.chain(results)
        .chunk(24)
        .map(chunk => 
          chunk.reduce(
            (acc, { sum }) => ({ ...acc, sum: sum + acc.sum }),
            { ...chunk[0], sum: 0 }
          )
        )
        .value(); 

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

  private combineResults(startDate: string, endDate: string, hourlyResults?: IResults<InfluxRow>, secondResults?: IResults<InfluxRow>): InfluxRow[] {
    const hourlyConsumption = this.zeroFillHours(startDate, endDate, hourlyResults);
    const lastHourConsumption = this.combineLastHourResults(endDate, hourlyConsumption, secondResults);

    return [
      ...hourlyConsumption.filter(({ time }) => time < lastHourConsumption.time),
     lastHourConsumption
    ];
  }

  private async queryDeviceConsumption(macAddress: string, startDate: string, endDate: string, timezone: string = 'Etc/UTC'): Promise<InfluxRow[]> {
    const hourlyQuery = this.formatQuery(macAddress, 'total_flow', this.influxHourlyMeasurement, startDate, endDate, timezone);
    const currentHourStart = moment().startOf('hour').toISOString();
    // If end date is past the start of the current hourt, then query from start of current hour to end date
    // to fill delta
    const secondQuery = moment(currentHourStart).isAfter(endDate) ?
      undefined :
      this.formatQuery(macAddress, 'f', this.influxSecondMeasurement, currentHourStart, endDate, timezone);
    const [hourlyResult, secondResult] = await Promise.all<IResults<InfluxRow> | undefined>([
      this.influxClient.query(hourlyQuery, { database: this.influxAnalyticsDb }),
      !secondQuery ? undefined : this.influxClient.query(secondQuery, { database: this.influxTelemetryDb })
    ]);

    return this.combineResults(startDate, endDate, hourlyResult, secondResult);
  }

  private combineLastHourResults(endDate: string, hourlyResults: InfluxRow[], secondResults?: InfluxRow[]): InfluxRow {
    const lastSecondResult = _.last(secondResults);
    const lastHour = moment((lastSecondResult ? lastSecondResult.time : endDate)).startOf('hour').toISOString();
    const matchingHourlyResult = _.find(
      hourlyResults, 
      hourlyResult => 
        moment(hourlyResult.time).startOf('hour').toISOString() === lastHour
    );
    return {
      time: new Date(lastHour),
      sum: (lastSecondResult ? lastSecondResult.sum : 0) + (matchingHourlyResult ? matchingHourlyResult.sum : 0)
    };
    
  }

  private zeroFillHours(startDate: string, endDate: string, hourlyResults?: InfluxRow[]): InfluxRow[] {

    if (!hourlyResults || !hourlyResults.length) {
      return this.padWithZeros(
        startDate, // left inclusive
        moment(endDate).add(1, 'hours').toISOString() // right inclusive
      );
    }

    const leftPad = this.padWithZeros(startDate, hourlyResults[0].time); // left inclusive, right exclusive
    const rightPad = this.padWithZeros(
      moment(hourlyResults[hourlyResults.length - 1].time).add(1, 'hours').toISOString(), // left exclusive
      endDate // right exclusive
    );

    return [
      ...leftPad,
      ...hourlyResults,
      ...rightPad
    ];
  }

  private padWithZeros(beginDate: string | Date, finishDate: string | Date): InfluxRow[] {
    const beginTime = moment(beginDate).startOf('hour').toISOString();
    const numHours = Math.abs(
      moment(finishDate).startOf('hour').diff(beginTime, 'hours')
    );
    const zeros = [];

    for (let i = 0; i < numHours; i++) {
      zeros.push({
        time: moment(beginTime).add(i, 'hours').toDate(),
        sum: 0
      });
    }

    return zeros;
  }

  private formatDate(date: string, timezone: string = 'Etc/UTC'): string {
    return (hasUTCOffset(date) ? moment(date) : moment.tz(date, timezone)).toISOString();
  }
}

function hasUTCOffset(date: string): boolean {
  return /T.+(Z|([-+](\d{2}:?(\d{2})?)))$/.test(date);
}

export { WaterService };