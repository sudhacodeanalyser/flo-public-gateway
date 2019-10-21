import { HttpService } from '../../http/HttpService';
import { inject, injectable } from 'inversify';

export interface WaterMeterReport {
  params: {
    macAddressList: string[];
    startDate: string;
    endDate: string;
    interval: string;
  };
  items: Array<{
    macAddress: string;
    items: Array<{
      date: string;
      used?: number;
      rate?: number;
      psi?: number;
      temp?: number;
      missing?: boolean;
    }>;
  }>
}


@injectable()
class WaterMeterService extends HttpService {
  constructor(
    @inject('WaterMeterUrl') private url: string
  ) {
    super();
  }

  public async getReport(macAddresses: string[],  startDate: string, endDate?: string, interval: string = '1h'): Promise<WaterMeterReport> {
    const queryString = [
      `macAddress=${ macAddresses.join(',') }`,
      `interval=${ interval }`,
      `startDate=${ startDate }`,
      endDate ? `endDate=${ endDate }` : ''
    ]
    .filter(param => param)
    .join('&');
    const request = {
      method: 'GET',
      url: `${ this.url }/report?${ queryString }`
    };

    return this.sendRequest(request);
  }
}

export { WaterMeterService };