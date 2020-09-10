import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { GooglePlacesService } from './GooglePlacesService';
import { GeoLocationService } from '../core/location/GeoLocationService';
import { Client as GoogleClient } from '@googlemaps/google-maps-services-js';
import { AxiosInstance } from 'axios';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<GoogleClient>('GoogleClient').toDynamicValue((context: interfaces.Context) => {
    const axiosInstance = context.container.get<AxiosInstance>('HttpClient');
    return new GoogleClient({ axiosInstance });
  }).inSingletonScope();
  bind<string>('GoogleMapsApiKey').toConstantValue(config.googleMapsApiKey);
  bind<GeoLocationService>('GeoLocationService').to(GooglePlacesService);
});
