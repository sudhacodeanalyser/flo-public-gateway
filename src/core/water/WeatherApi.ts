import { injectable, inject } from 'inversify';
import { HttpService, HttpRequest } from '../../http/HttpService';
import * as _ from 'lodash';

export interface WeatherData {
  params: any; 
  location: any;
  current: number;
  items: Array<{
    time: string;
    temp: number;
  }>
}

export interface AddressData {
  street?: string;
  city?: string;
  region?: string;
  postCode?: string;
  country?: string;
}

@injectable()
class WeatherApi extends HttpService {
  @inject('WeatherApiUrl') private readonly weatherApiUrl: string

  public async getTemperatureByAddress(address: AddressData, startDate: Date, endDate: Date, interval?: string): Promise<WeatherData> {
    const request: HttpRequest = {
      method: 'GET',
      url: `${ this.weatherApiUrl }/temperature/address`,
      params: {
        ..._.pickBy(address, value => !!value),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        interval
      }
    };

    return this.sendRequest(request);
  }
}

export { WeatherApi };