import _ from 'lodash';
import { Location, Timestamped } from '../api';

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

type CommonRecordProps =
    'location_id' |
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

type CommonModelProps =
    'id' |
    'address' |
    'address2' |
    'city' |
    'state' |
    'country' |
    'postalCode' |
    'timezone' |
    'gallonsPerDayGoal' |
    'occupants' |
    'stories' |
    'isProfileComplete' |
    'createdAt' |
    'updatedAt';

type RecordModelProp = Partial<Record<'common' | 'record' | 'model', string>>;


function translate<S extends {}, D>(modelRecordProps: RecordModelProp[], source: keyof RecordModelProp, dest: keyof RecordModelProp, sourceData: S): D {
  type PropMap = { [srcKey: string]: string };
  const props: PropMap = modelRecordProps
    .filter((prop: RecordModelProp) =>
      prop.common !== undefined ||
      prop[source] !== undefined
    )
    .reduce(
      (acc: PropMap, prop: RecordModelProp) => ({
        ...acc,
        ...({
          [prop.common !== undefined ? prop.common : (prop[source] as string)]: prop.common !== undefined ?
            prop.common :
            prop[dest]
        })
      }),
      {}
    );

  return _.chain(sourceData)
    .pick(Object.keys(props))
    .mapKeys((value: any, key: string) => props[key] === undefined ? key : props[key])
    .value() as any;
}

export class LocationRecord {

  public static fromModel(location: Location): LocationRecordData {
    type CommonProps = Pick<LocationRecordData, CommonRecordProps>;

    return {
      account_id: location.account && location.account.id,
      ...translate<Location, CommonProps>(LocationRecord.modelRecordProps, 'model', 'record', location)
    };
  }

  public static fromPartialModel(location: Partial<Location>): Partial<LocationRecordData> {
    type CommonProps = Partial<Pick<LocationRecordData, CommonRecordProps>>;

    return {
      account_id: location.account && location.account.id,
      ...translate<Partial<Location>, CommonProps>(LocationRecord.modelRecordProps, 'model', 'record', location)
    };
  }

  private static modelRecordProps: RecordModelProp[] = [
    { record: 'location_id', model: 'id' },
    { common: 'address' },
    { common: 'address2' },
    { common: 'city' },
    { common: 'state' },
    { common: 'country' },
    { record: 'postalcode', model: 'postalCode' },
    { common: 'timezone' },
    { record: 'gallons_per_day_goal', model: 'gallonsPerDayGoal' },
    { common: 'occupants' },
    { common: 'stories' },
    { record: 'is_profile_complete', model: 'isProfileComplete' },
    { record: 'created_at', model: 'createdAt' },
    { record: 'updated_at', model: 'updatedAt' }
  ];

  constructor(
    public data: LocationRecordData
  ) {}

  public toModel(): Location {
    type CommonProps = Pick<Location, CommonModelProps>;
    const commonProps = translate<LocationRecordData, CommonProps>(LocationRecord.modelRecordProps, 'record', 'model', this.data)

    // TODO Implement location profile
    return {
      account: {
        id: this.data.account_id
      },
      users: [],
      devices: [],
      userRoles: [],
      subscription: undefined,
      ...commonProps
    };
  }
}