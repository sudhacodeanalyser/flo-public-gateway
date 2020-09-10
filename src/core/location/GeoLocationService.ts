import { GeoLocation } from '../api';

export type GeoLocationQuery = {
  address: string,
  city?: string,
  state?: string,
  country?: string,
}

export interface GeoLocationService {
  getCoordinatesFromQuery(query: GeoLocationQuery): Promise<GeoLocation>
}
