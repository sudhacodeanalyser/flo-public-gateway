import _ from 'lodash';
import { Location, Timestamped } from '../api/api';

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

export interface LocationRecordData extends Partial<LegacyLocationProfile>, Timestamped {
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
  profile?: LocationProfile
}

type CommonRecordModelProps =     
    'address' |
    'address2' |
    'city' |
    'state' |
    'country' |
    'postalcode' |
    'timezone' |
    'gallons_per_day_goal' |
    'occupants' |
    'stories' |
    'is_profile_complete' |
    'created_at' |
    'updated_at';

type CommonRecordModel = Pick<Location, CommonRecordModelProps>;

function safePick<I, O>(source: I, keys: string[]): O {
  return _.pick(source, keys) as any;
}

export class LocationRecord {

  public static fromModel(location: Location): LocationRecordData {
    const commonProps: CommonRecordModel = safePick<Location, CommonRecordModel>(
      location, 
      LocationRecord.commonModelRecordProps
    );

    return {
      location_id: location.id,
      account_id: location.account && location.account.id,
      ...commonProps,
    };
  }

  public static fromPartialModel(location: Partial<Location>): Partial<LocationRecordData> {
    const commonProps = safePick<Partial<Location>, Partial<CommonRecordModel>>(
      location, 
      LocationRecord.commonModelRecordProps
    );

    return {
      location_id: location.id,
      account_id: location.account && location.account.id,
      ...commonProps
    };
  }

  private static commonModelRecordProps: string[] = [
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
    'created_at',
    'updated_at'
  ];

  constructor(
    public data: LocationRecordData
  ) {}

  public toModel(): Location {
    const commonProps = safePick<LocationRecordData, CommonRecordModel>(this.data, LocationRecord.commonModelRecordProps);

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