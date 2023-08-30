import { injectable, inject } from 'inversify';
import moment from 'moment-timezone';
import * as _ from 'lodash';
import { DeviceService, LocationService } from '../service';
import { Location, DependencyFactoryFactory, WaterConsumptionReport, WaterConsumptionInterval, WaterAveragesReport, WaterMetricsReport } from '../api';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { WaterMeterService, WaterMeterReport, WaterMeterDeviceReport, WaterMeterDeviceData } from './WaterMeterService';
import { WeatherApi, WeatherData, AddressData } from './WeatherApi';
import NotFoundError from '../api/error/NotFoundError';

type AveragesResult = {
  averageConsumption: number,
  numRecords: number,
  startDate: moment.Moment,
  endDate?: moment.Moment
};

interface WaterMeterDeviceDataWithWeather extends WaterMeterDeviceData {
  averageWeatherTempF?: number;
}

interface WaterMeterDeviceReportWithWeather extends WaterMeterDeviceReport {
  items: WaterMeterDeviceDataWithWeather[];
}

@injectable()
class WaterService {
  private static readonly MIN_DAY_OF_WEEK_AVG_NUM_HOURS = Math.floor(72 * 0.8); // Must be > 80% of 3 days of hourly data
  private static readonly MIN_WEEKLY_AVG_NUM_HOURS = Math.floor(168 * 0.8); // Must be > 80% of 7 days of hourly data
  private static readonly MIN_MONTHLY_AVG_NUM_HOURS = 6 * 24; // Must have > 6 days of data to generate estimated monthly average
  private deviceServiceFactory: () => DeviceService;
  private locationServiceFactory: () => LocationService;

  constructor(
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('WaterMeterService') private waterMeterService: WaterMeterService,
    @inject('WeatherApi') private weatherApi: WeatherApi
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
    this.locationServiceFactory = depFactoryFactory<LocationService>('LocationService');
  }

  public async getLocationConsumption(
    locationId: string[] | undefined, startDate: string, endDate: string = new Date().toISOString(), interval: WaterConsumptionInterval = WaterConsumptionInterval.ONE_HOUR, timezone?: string, userId?: string
  ): Promise<WaterConsumptionReport> {
    const tz = timezone || (locationId?.length ? pipe(
      await this.locationServiceFactory().getLocation(locationId[0], {
        $select: {
          timezone: true
        }
      }),
      Option.fold(
        () => 'Etc/UTC',
        location => location.timezone || 'Etc/UTC'
      )
    ): 'Etc/UTC');
    const start = this.formatDate(startDate, tz);
    const end = this.formatDate(endDate, tz);

    const macAddresses = (userId && !locationId) ?
      await this.locationServiceFactory().getAllDevicesByUserId(userId)
        :
      await this.locationServiceFactory().getAllDevicesByLocationIds(locationId || []);

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
            timezone: true,
            address: true,
            city: true,
            postalCode: true,
            state: true,
            country: true
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
    const address = pipe(
      device,
      Option.fold(
        () => { throw new NotFoundError('Device not found.') },
        d => this.getAddressData(d.location as Location)
      )
    );
    const start = this.formatDate(startDate, timezone);
    const end = this.formatDate(endDate, timezone);
    const waterReport = await this.getWaterMeterReport([macAddress], start, end, interval, timezone);
    const weatherData = await this.weatherApi.getTemperatureByAddress(
      address, 
      new Date(start), 
      new Date(end), 
      '1h'
    );
    const results = this.joinWeatherData(waterReport, weatherData, new Date(end));
    const items = (results.length && results[0].items) || [];

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
        averageTempF: item.temp,
        averageWeatherTempF: item.averageWeatherTempF
      }))
    };
  }

  public async ping(): Promise<any> {
    return this.waterMeterService.ping();
  }

  public async getAvailableMetrics(availableMetricsRequest: any): Promise<any> {
    return this.waterMeterService.getAvailableMetrics(availableMetricsRequest);
  }

  public async queryMetrics(queryMetricsRequest: any): Promise<any> {
    return this.waterMeterService.queryMetrics(queryMetricsRequest);
  }

  public async annotations(annotationsReq: any): Promise<any> {
    return this.waterMeterService.annotations(annotationsReq);
  }

  public async tagKeys(tagKeysReq: any): Promise<any> {
    return this.waterMeterService.tagKeys(tagKeysReq);
  }

  public async tagValues(tagValuesReq: any): Promise<any> {
    return this.waterMeterService.tagValues(tagValuesReq);
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
        monthlyAvg: monthlyAverageConsumption === null || _.isEmpty(monthlyAverageConsumption) || monthlyAverageConsumption.numRecords < WaterService.MIN_MONTHLY_AVG_NUM_HOURS ?
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
          moment(date).tz(timezone).format('YYYY-MM-DD')
      )
      .mapValues(day => ({
        sum: _.sumBy(day, 'used'),
        numRecords: day.length
      }))
      .values()
      .value();

    // Estimated monthly average fix. SEE: https://flotechnologies-jira.atlassian.net/browse/CLOUD-3453
    if (interval === WaterConsumptionInterval.ONE_MONTH) {
      const dailyAvg = _.meanBy(aggregations, 'sum');
      const daysInMonth = (moment().tz(timezone).isLeapYear() ? 366 : 365) / 12;
      return {
        averageConsumption: dailyAvg * daysInMonth,
        numRecords: _.sumBy(aggregations, 'numRecords')
      };
    }
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

  private formatConsumptionReport(startDate: string, endDate: string, interval: string, timezone: string, results: WaterMeterReport, locationId?: string[], macAddress?: string): WaterConsumptionReport {
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
        locationId: (locationId && locationId.length === 1) ? locationId[0] : undefined,
        locationIds: (locationId && locationId.length  > 1) ? locationId : undefined,
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

  private async batchGetWaterReport(macAddresses: string[], startDate: string, endDate: string, interval: string, timezone: string = 'Etc/UTC'): Promise<WaterMeterReport> {
    const chunks = _.chunk(macAddresses, 50);
    const results = await Promise.all(chunks.map(async macAdds => this.waterMeterService.getReport(macAdds, startDate, endDate, '1h', timezone)));
    return results.reduce((acc, report) => {
      return {
        params: {
          ...acc.params,
          macAddressList: [ ...acc.params.macAddressList, ...report.params.macAddressList ],
          startDate: report.params.startDate,
          endDate: report.params.endDate,
          interval: report.params.interval
        },
        items: [ ...acc.items, ...report.items ]
      }
    }, {
      params: {
        macAddressList: [],
        startDate,
        endDate,
        interval,
      },
      items: []
    })
  }

  private async getWaterMeterReport(macAddresses: string[], startDate: string, endDate: string, interval: WaterConsumptionInterval, timezone: string = 'Etc/UTC'): Promise<WaterMeterReport> {
    const results = await this.batchGetWaterReport(macAddresses, startDate, endDate, '1h', timezone);
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
              used: _.sumBy(nonMissingData, 'used'),
              psi: _.meanBy(nonMissingData, 'psi'),
              temp: _.meanBy(nonMissingData, 'temp'),
              rate: _.meanBy(nonMissingData, 'rate')
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

  private joinWeatherData(waterReport: WaterMeterReport, weatherData: WeatherData, endDate: Date): WaterMeterDeviceReportWithWeather[] {

    return waterReport.items.map(deviceItems => {

      if (!deviceItems.items || !deviceItems.items.length) {
        return deviceItems as WaterMeterDeviceReportWithWeather;
      }
   
      const firstDate = deviceItems.items[0].date;
      let startIndex = _.findIndex(
        weatherData.items, 
        ({ time }) => moment(time).isSameOrAfter(firstDate)
      );
      const items: WaterMeterDeviceDataWithWeather[] = deviceItems.items
        .map((item, i) => {
          const nextItem = (deviceItems.items || [])[i + 1];
          const endIndex = _.findIndex(
            weatherData.items,
            ({ time }) => moment(time).isSameOrAfter(nextItem ? nextItem.date : endDate), 
            startIndex
          );
          const averageWeatherTempF = !weatherData.items.length || endIndex === undefined ?
            undefined :
            _.chain(weatherData.items)
              .slice(
                startIndex,
                endIndex < 0 ? undefined : endIndex
              )
              .meanBy('temp')
              .value();

          startIndex = !endIndex || endIndex < 0 ? weatherData.items.length : endIndex;

          return {
            ...item,
            averageWeatherTempF: averageWeatherTempF && Math.floor(averageWeatherTempF)
          };
        });

      const deviceReport: WaterMeterDeviceReportWithWeather = {
        ...deviceItems,
        items
      };

      return deviceReport;
    })
  }

  private getAddressData(location: Location): AddressData {
    return {
      street: location.address,
      city: location.city,
      postCode: location.postalCode,
      region: location.state,
      country: location.country      
    };
  }
}

function hasUTCOffset(date: string): boolean {
  return /T.+(Z|([-+](\d{2}:?(\d{2})?)))$/.test(date);
}

export { WaterService };