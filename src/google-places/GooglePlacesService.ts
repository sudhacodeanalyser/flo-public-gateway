import { inject, injectable } from 'inversify';
import { Client as GoogleClient, PlaceInputType } from '@googlemaps/google-maps-services-js';
import { GeoLocationQuery, GeoLocationService } from '../core/location/GeoLocationService';
import Logger from 'bunyan';
import { GeoLocation } from '../core/api';

@injectable()
class GooglePlacesService implements GeoLocationService {

  constructor(
    @inject('GoogleMapsApiKey') private readonly googleMapsApiKey: string,
    @inject('Logger') private readonly logger: Logger,
    @inject('GoogleClient') private readonly client: GoogleClient,
  ) {}

  public async getCoordinatesFromQuery(query: GeoLocationQuery): Promise<GeoLocation> {

    const field = (value?: string) => value ? `, ${value}` : '';
    const queryString = `${query.address}${field(query.city)}${field(query.state)}${field(query.country)}`;

    try {
      const data = await this.client.findPlaceFromText({
        params: {
          input: queryString,
          inputtype: PlaceInputType.textQuery,
          key: this.googleMapsApiKey,
        },
      });

      if (!data.data.candidates.length) {
        this.logger.warn('Could not find any location coordinates for address:', query);
        return {};
      }

      const place = data.data.candidates[0]; // choose first candidate
      const { data: { result: { geometry } } } = await this.client.placeDetails({
        params: { place_id: place.place_id as string, fields: ['geometry'], key: this.googleMapsApiKey }
      });

      if (!geometry?.location) {
        this.logger.warn('Could not find any location details for placeId:', place.place_id);
        return {};
      }

      return {
        coordinates: {
          latitude: geometry.location.lat,
          longitude: geometry.location.lng,
        }
      }
    } catch (error) {
      this.logger.error('Error fetching geo location coordinates', error);
      return {};
    }
  }

}


export { GooglePlacesService }
