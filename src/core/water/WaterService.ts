import { injectable, inject } from 'inversify';
import { InfluxDB, IResults } from 'influx';
import moment from 'moment-timezone';
import _ from 'lodash';
import { DeviceService, LocationService } from '../service';
import { DependencyFactoryFactory, WaterConsumptionItem, WaterConsumptionReport, WaterConsumptionInterval } from '../api';

type InfluxRow = { time: Date, sum: number };

@injectable()
class WaterService {
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
    const location = await (timezone ? undefined : this.locationServiceFactory().getLocation(locationId));
    const tz = _.get(location, 'timezone', timezone);
    const devicesConsumption = await Promise.all(
      devices.map(({ macAddress }) => this.queryDeviceConsumption(macAddress, startDate, endDate, tz))
    );
    const results = _.zipWith(
      ...devicesConsumption, 
      (...hours: InfluxRow[]) => 
       hours.reduce(
         (acc, { sum }) => ({ ...acc, sum: sum + acc.sum }),
         { ...hours[0], sum: 0 }
       )
    );

    return this.formatReport(startDate, endDate, interval, tz, results, locationId);
  }

  public async getDeviceConsumption(macAddress: string, startDate: string, endDate: string = new Date().toISOString(), interval: string = WaterConsumptionInterval.ONE_HOUR, timezone?: string): Promise<WaterConsumptionReport> {
    const device = await (timezone ? undefined : this.deviceServiceFactory().getByMacAddress(macAddress, ['location']));
    const tz = _.get(device, 'location.timezone', timezone);
    const results = await this.queryDeviceConsumption(macAddress, startDate, endDate, tz);

    return this.formatReport(startDate, endDate, interval, tz, results, undefined, macAddress);
  }

  private formatQuery(macAddress: string, column: string, measurement: string, startDate: string, endDate: string, timezone: string): string {

    if (endDate < startDate) {
      throw new Error('Invalid date range');
    }

    return `
      SELECT sum(${ column }) FROM ${ measurement }
      WHERE did::tag = '${ macAddress }'
      AND time >= '${ startDate }'
      AND time < '${ endDate }'
      GROUP BY time(1h) fill(0) tz('${ timezone }')
    `.replace(/\s/, ' ');
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
      items: items.map(({ time, sum }) => ({
        time: moment(time).tz(timezone).format(),
        gallonsConsumed: sum
      }))
    };
  }

  private combineResults(startDate: string, endDate: string, hourlyResults?: IResults<InfluxRow>, secondResults?: IResults<InfluxRow>): InfluxRow[] {
    const hourlyConsumption =this.zeroFillHours(startDate, endDate, hourlyResults);
    const lastHourConsumption = this.combineLastHourResults(endDate, hourlyConsumption, secondResults);

    return [
      ...hourlyConsumption.slice(0, hourlyConsumption.length - 1),
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
      time: moment(lastSecondResult ? lastSecondResult.time : endDate).startOf('hour').toDate(),
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
}

export { WaterService };