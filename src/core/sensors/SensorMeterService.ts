import { HttpService } from '../../http/HttpService';
import { inject, injectable } from 'inversify';

export interface SensorMeterReport {
  params: {
    macAddress: string;
    startDate: string;
    endDate: string;
    interval: string;
    timezone: string;
  };
  items: Array<{
    date: string;
    avgBatteryVoltage?: number;
    avgBatteryPercentage?: number;
    avgHumidity?: number;
    avgTemperature?: number;
  }>;
}


@injectable()
class SensorMeterService extends HttpService {
  constructor(
    @inject('SensorMeterUrl') private url: string
  ) {
    super();
  }

  public async getReport(macAddress: string, startDate: string | undefined, endDate: string | undefined, interval: string, timezone: string): Promise<SensorMeterReport> {
    const params = {
      macAddress,
      interval,
      timezone,
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    };
    const request = {
      method: 'GET',
      url: `${ this.url }/devices/${macAddress}/telemetry`,
      params
    };

    return this.sendRequest(request);
  }
}

export { SensorMeterService };