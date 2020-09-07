import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { GooglePlacesService } from './GooglePlacesService';
import { GeoLocationService } from '../core/location/GeoLocationService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('GoogleMapsApiKey').toConstantValue(config.googleMapsApiKey);
  bind<GeoLocationService>('GeoLocationService').to(GooglePlacesService);
});
