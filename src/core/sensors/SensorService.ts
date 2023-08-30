import { injectable, inject } from 'inversify';
import moment from 'moment-timezone';
import * as _ from 'lodash';
import { DeviceService } from '../service';
import { DependencyFactoryFactory, SensorInterval, SensorMetricsReport } from '../api';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { SensorMeterService, SensorMeterReport } from './SensorMeterService';

@injectable()
class SensorService {
  private static readonly MIN_DAY_OF_WEEK_AVG_NUM_HOURS = Math.floor(72 * 0.8); // Must be > 80% of 3 days of hourly data
  private static readonly MIN_WEEKLY_AVG_NUM_HOURS = Math.floor(168 * 0.8); // Must be > 80% of 7 days of hourly data
  private static readonly MIN_MONTHLY_AVG_NUM_DAYS = 28 * 24;
  private deviceServiceFactory: () => DeviceService;

  constructor(
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory,
    @inject('SensorMeterService') private sensorMeterService: SensorMeterService
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
  }

  public async getMetricsAveragesByDevice(macAddress: string, startDate: string | undefined, endDate: string | undefined, interval: SensorInterval = SensorInterval.ONE_HOUR, tz?: string): Promise<SensorMetricsReport> {
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

    const start = (startDate && this.formatDate(startDate, timezone, true)) || undefined;
    const end = (endDate && this.formatDate(endDate, timezone, true)) || undefined;

    const results = await this.getSensorsMetricsReport(macAddress, start, end, interval, timezone);
    const items = (results.items.length && results.items) || [];

    return {
      params: {
        tz: timezone,
        ...(start && { startDate: this.formatDate(start, timezone) }),
        ...(end && { endDate: this.formatDate(end, timezone) }),
        macAddress,
        interval
      },
      items: items.map(item => ({
        time: item.date,
        averageBattery: item.avgBatteryPercentage,
        averageHumidity: item.avgHumidity,
        averageTempF: item.avgTemperature
      }))
    };
  }

  private formatDate(date: string, timezone: string, noOffset: boolean = false): string {
    return moment.tz(date, timezone).format(noOffset ? 'YYYY-MM-DDTHH:mm:ss' : undefined);
  }

  private async getSensorsMetricsReport(macAddress: string, startDate: string | undefined, endDate: string | undefined, interval: SensorInterval, timezone: string): Promise<SensorMeterReport> {
    const results = await this.sensorMeterService.getReport(macAddress, startDate, endDate, interval, timezone);

    const formattedDateItems = results.items.map(item => {
      const zonedDate = moment.tz(item.date, timezone);
      const formattedDate = interval === SensorInterval.ONE_HOUR ?
        zonedDate.format() :
          interval === SensorInterval.ONE_DAY ?
            zonedDate.format('YYYY-MM-DD') :
            zonedDate.format('YYYY-MM');

      return {
        ...item,
        date: formattedDate
      }
    });

    return {
      ...results,
      items: formattedDateItems
    };
  }
}

export { SensorService };