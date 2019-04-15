import _ from 'lodash';
import { Location } from '../api/api';

export enum NoYesUnsure {
  NO = 0,
  YES,
  UNSURE
}

// TODO Look up the actual names of these categories
export enum LegacyLocationSizeCategory {
  ZERO = 0,
  ONE, 
  TWO,
  THREE,
  FOUR
}

export enum LegacyLocationType {
  SINGLE_FAMILY_HOME = 'sfh',
  APARTMENT = 'apt',
  CONDO = 'condo',
  IRRIGATION_ONLY = 'irrigation'
}

export enum LegacyBathroomAmenity {
  HOT_TUB = 'Hot Tub', 
  SPA = 'Spa', 
  BATHTUB ='Bathtub'
}

export enum LegacyKitchenAmenity {
  DISHWASHER = 'Dishwasher',
  WASHING_MACHINE = 'Washer / Dryer',
  REFRIDGERATOR_ICE_MAKE = 'Fridge with Ice Maker'
}

export enum LegacyOutdoorAmenity {
  HOT_TUB = 'Hot Tub',
  IRRIGATION = 'Sprinklers',
  SPA = 'Spa',
  SWIMMING_POOL = 'Swimming Pool',
  FOUNTAIN = 'Fountains'
}

export interface LegacyLocationProfile {
  expansion_tank: NoYesUnsure,
  tankless: NoYesUnsure,
  galvanized_plumbing: NoYesUnsure,
  water_filtering_system: NoYesUnsure,
  water_shutoff_known: NoYesUnsure,
  hot_water_recirculation: NoYesUnsure,
  whole_house_humidifier: NoYesUnsure,
  location_size_category?: LegacyLocationSizeCategory,
  location_type?: LegacyLocationType,
  bathroom_amenities: LegacyBathroomAmenity[],
  kitchen_amenities: LegacyKitchenAmenity[],
  outdoor_amenities: LegacyOutdoorAmenity[]
}

// Location Profile V2
export interface LocationProfile {
  // TODO
  foo: any
}

// This will need to be enforced as a runtime validation
type Integer = number;

export interface LocationRecordData extends LegacyLocationProfile {
  account_id: string,
  location_id: string
  address: string,
  address2?: string,
  city: string,
  state: string,
  country: string,
  postalcode: string,
  timezone: string,
  gallons_per_day_goal: Integer,
  occupants?: Integer, 
  stories?: Integer,
  is_profile_complete?: boolean,
  is_using_away_schedule?: boolean,
  profile: LocationProfile,
  created_at?: string,
  updated_at?: string
}

export class LocationRecord {
  constructor(
    public data: LocationRecordData
  ) {}

  public toModel(): Location {
    const commonProps = _.pick(this.data, [
      'address',
      'address2',
      'city',
      'state',
      'country',
      'postalcode',
      'timezone',
      'gallons_per_day_goal',
      'occupants',
      'stories',
      'is_profile_complete',
      'is_using_away_schedule',
      'created_at',
      'updated_at'
    ]);

    // TODO Implement location profile 
    return {
      id: this.data.location_id,
      account: {
        id: this.data.account_id
      },
      users: [],
      devices: [],
      ...commonProps
    };
  }
}