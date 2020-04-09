import { HttpService } from '../../http/HttpService';
import { inject, injectable } from 'inversify';
import moment from 'moment-timezone';

export interface WaterMeterDeviceData {
  date: string;
  used?: number;
  rate?: number;
  psi?: number;
  temp?: number;
  missing?: boolean; 
}

export interface WaterMeterDeviceReport {
  macAddress: string;
  items?: WaterMeterDeviceData[];
}

export interface WaterMeterReport {
  params: {
    macAddressList: string[];
    startDate: string;
    endDate: string;
    interval: string;
  };
  items: WaterMeterDeviceReport[];
}


@injectable()
class WaterMeterService extends HttpService {
  constructor(
    @inject('WaterMeterUrl') private url: string
  ) {
    super();
  }

  public async getReport(macAddresses: string[],  startDate: string, endDate?: string, interval: string = '1h', timezone: string = 'Etc/UTC'): Promise<WaterMeterReport> {
    const queryString = [
      `macAddress=${ macAddresses.join(',') }`,
      `interval=${ interval }`,
      `startDate=${ moment(startDate).utc().format('YYYY-MM-DD') }`,
      endDate ? `endDate=${ moment(endDate).add(1, 'days').utc().format('YYYY-MM-DD') }` : ''
    ]
    .filter(param => param)
    .join('&');
    const request = {
      method: 'GET',
      url: `${ this.url }/report?${ queryString }`
    };

    return this.sendRequest(request);
  }

  public async ping(): Promise<any> {
    const request = {
      method: 'GET',
      url: `${ this.url }/grafana`,
    };

    return this.sendRequest(request);
  }

  public async getAvailableMetrics(availableMetricsRequest: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${ this.url }/grafana/search`,
      body: availableMetricsRequest
    };

    return this.sendRequest(request);
  }

  public async queryMetrics(queryMetricsRequest: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${ this.url }/grafana/query`,
      body: queryMetricsRequest
    };

    return this.sendRequest(request);
  }

  public async annotations(annotationsRequest: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${ this.url }/grafana/annotations`,
      body: annotationsRequest
    };

    return this.sendRequest(request);
  }

  public async tagKeys(tagKeysRequest: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${ this.url }/grafana/tag-keys`,
      body: tagKeysRequest
    };

    return this.sendRequest(request);
  }

  public async tagValues(tagValuesRequest: any): Promise<any> {
    const request = {
      method: 'POST',
      url: `${ this.url }/grafana/tag-values`,
      body: tagValuesRequest
    };

    return this.sendRequest(request);
  }
}

export { WaterMeterService };