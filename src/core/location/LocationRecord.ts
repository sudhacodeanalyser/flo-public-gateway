import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as _ from 'lodash';
import { morphism, StrictSchema } from 'morphism';
import { IndoorAmenity, Location, LocationSize, LocationType, Omit, OutdoorAmenity, PlumbingAppliance, PlumbingType, SystemMode, Timestamped } from '../api';
import { translateNumericToStringEnum, translateStringToNumericEnum } from '../api/enumUtils';
import { NoYesUnsure } from '../api/NoYesUnsure';
import { NonEmptyString } from '../api/validator/NonEmptyString';

export enum LegacyLocationSizeCategory {
  LTE_700 = 0,
  GT_700_LTE_1000,
  GT_1000_LTE_2000,
  GT_2000_LTE_4000,
  GT_4000
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
  REFRIGERATOR_ICE_MAKER = 'Fridge with Ice Maker'
}

export enum LegacyOutdoorAmenity {
  HOT_TUB = 'Hot Tub',
  IRRIGATION = 'Sprinklers',
  SPA = 'Spa',
  SWIMMING_POOL = 'Swimming Pool',
  FOUNTAIN = 'Fountains'
}

export interface LegacyLocationProfile {
  expansion_tank: NoYesUnsure.Numeric,
  tankless: NoYesUnsure.Numeric,
  galvanized_plumbing: NoYesUnsure.Numeric,
  water_filtering_system: NoYesUnsure.Numeric,
  water_shutoff_known: NoYesUnsure.Numeric,
  hot_water_recirculation: NoYesUnsure.Numeric,
  whole_house_humidifier: NoYesUnsure.Numeric,
  location_size_category?: LegacyLocationSizeCategory,
  location_type?: LegacyLocationType,
  bathroom_amenities: LegacyBathroomAmenity[],
  kitchen_amenities: LegacyKitchenAmenity[],
  outdoor_amenities: LegacyOutdoorAmenity[]
}

// Location Profile V2

enum LocationTypeData {
  OTHER = 0,
  SFH,
  APARTMENT,
  CONDO,
  VACATION
}

enum ResidenceTypeData {
  OTHER = 0,
  PRIMARY,
  RENTAL,
  VACATION
}

enum WaterSourceData {
  UTILITY = 1,
  CITY
}

enum LocationSizeData {
  LTE_700_FT = 1,
  GT_700_FT_LTE_1000_FT,
  GT_1000_FT_LTE_2000_FT,
  GT_2000_FT_LTE_4000_FT,
  GT_4000_FT
}

enum PlumbingTypeData {
  COPPER = 1,
  GALVANIZED = 2
}

enum IndoorAmenityData {
  BATHTUB = 1,
  HOT_TUB,
  WASHING_MACHINE,
  DISHWASHER,
  ICE_MAKER
}

enum OutdoorAmenityData {
  POOL = 1,
  POOL_AUTO_FILL,
  HOT_TUB,
  FOUNTAIN,
  POND
}

enum PlumbingApplicanceData {
  TANKLESS_WATER_HEATER = 1,
  EXPANSION_TANK,
  WHOLE_HOME_FILTRATION,
  WHOLE_HOME_HUMIDIFIER,
  RECIRCULATION_PUMP,
  REVERSE_OSMOSIS,
  WATER_SOFTENER,
  PRESSURE_REDUCING_VALVE
}

enum WaterDamageClaimData {
  LTE_10K_USD = 1,
  GT_10K_USD_LTE_50K_USD,
  GT_50K_USD_LTE_100K_USD,
  GT_100K_USD
}

export interface LocationProfile {
  location_type?: string,
  residence_type?: string,
  water_source?: string,
  location_size?: string,
  shower_bath_count?: number,
  toilet_count?: number,
  water_shutoff_known: NoYesUnsure.Numeric,
  plumbing_type?: string,
  indoor_amenities: string[],
  outdoor_amenities: string[],
  plumbing_applicances: string[],
  home_owners_insurance?: string,
  has_past_water_damage: boolean,
  past_water_damage_claim_amount?: string
  water_utility?: string
}

interface AreaRecord {
  id: string;
  name: string;
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
  profile?: LocationProfile,
  location_name?: string,
  target_system_mode?: SystemMode;
  revert_scheduled_at?: string;
  revert_mode?: SystemMode;
  revert_minutes?: number;
  is_irrigation_schedule_enabled?: boolean;
  areas: AreaRecord[];
  parent_location_id?: string;
  location_class?: string;
  _merged_into_location_id?: string;
  geo_positioning?: GeoLocationRecord
}

interface GeoLocationRecord {
  coordinates?: {
    latitude: number;
    longitude: number;
  }
}

const RecordToModelSchema: StrictSchema<Location, LocationRecordData> = {
  id: 'location_id',
  parent: (input: LocationRecordData) => {
    return input.parent_location_id ? { id: input.parent_location_id, nickname: '' } : undefined;
  },
  children: () => [],
  account: {
    id: 'account_id'
  },
  users: () => [],
  devices: () => [],
  userRoles: () => [],
  subscription: () => undefined,
  address: 'address',
  address2: 'address2',
  city: 'city',
  state: 'state',
  country: 'country',
  postalCode: 'postalcode',
  timezone: (input: LocationRecordData) =>
    pipe(
      NonEmptyString.decode(input.timezone || 'America/New_York'), // For Sebastien
      Either.fold(
        () => { throw Error('Invalid timezone value.'); }, // Theoretically unreachable
        result => result
      )
    )
  ,
  gallonsPerDayGoal: 'gallons_per_day_goal',
  occupants: 'occupants',
  stories: 'stories',
  isProfileComplete: 'is_profile_complete',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  homeownersInsurance: 'profile.home_owners_insurance',
  hasPastWaterDamage: 'profile.has_past_water_damage',
  showerBathCount: 'profile.shower_bath_count',
  toiletCount: 'profile.toilet_count',
  nickname: (input: LocationRecordData) => {
    return _.get(input, 'location_name', input.address);
  },
  irrigationSchedule: (input: LocationRecordData) =>
    input.is_irrigation_schedule_enabled === undefined ?
      undefined :({
        isEnabled: input.is_irrigation_schedule_enabled
      }),
  systemMode: (input: LocationRecordData) => ({
    target: input.target_system_mode,
    revertMinutes: input.revert_minutes,
    revertMode: input.revert_mode,
    revertScheduledAt: input.revert_scheduled_at
  }),
  locationType: (input: LocationRecordData) => {
    if (input.profile !== undefined && input.profile.location_type !== undefined) {
      return input.profile.location_type;
    }

    switch (input.location_type) {
      case LegacyLocationType.APARTMENT:
        return LocationType.APARTMENT;
      case LegacyLocationType.CONDO:
        return LocationType.CONDO;
      case LegacyLocationType.SINGLE_FAMILY_HOME:
        return LocationType.SFH
      default:
        return undefined;
    }
  },
  residenceType: 'profile.residence_type',
  waterSource: 'profile.water_source',
  locationSize: (input: LocationRecordData) => {
    if (input.profile && input.profile.location_size) {
      return input.profile.location_size;
    }

    switch (input.location_size_category) {
      case LegacyLocationSizeCategory.LTE_700:
        return LocationSize.LTE_700_FT;
      case LegacyLocationSizeCategory.GT_700_LTE_1000:
        return LocationSize.GT_700_FT_LTE_1000_FT;
      case LegacyLocationSizeCategory.GT_1000_LTE_2000:
        return LocationSize.GT_1000_FT_LTE_2000_FT;
      case LegacyLocationSizeCategory.GT_2000_LTE_4000:
        return LocationSize.GT_2000_FT_LTE_4000_FT;
      case LegacyLocationSizeCategory.GT_4000:
      default:
        return LocationSize.GT_4000_FT;
    }
  },
  waterShutoffKnown: (input: LocationRecordData) => {
    return translateNumericToStringEnum(
      NoYesUnsure.String,
      NoYesUnsure.Numeric,
      (input.profile && input.profile.water_shutoff_known) || input.water_shutoff_known,
      'UNSURE'
    ) || NoYesUnsure.String.UNSURE;
  },
  plumbingType: (input: LocationRecordData) => {
   if (input.profile !== undefined && input.profile.plumbing_type !== undefined) {
      return input.profile.plumbing_type;
    } else if (input.galvanized_plumbing === NoYesUnsure.Numeric.YES) {
      return PlumbingType.GALVANIZED;
    } else if (input.galvanized_plumbing === NoYesUnsure.Numeric.NO) {
      return PlumbingType.COPPER;
    } else {
      return undefined;
    }
  },
  indoorAmenities: (input: LocationRecordData) => {
    if (input.profile !== undefined && !_.isEmpty(input.profile.indoor_amenities)) {
      return input.profile.indoor_amenities;
    }

    const kitchenAmenities = (input.kitchen_amenities || [])
      .map(kitchenAmenity => {
        switch (kitchenAmenity) {
          case LegacyKitchenAmenity.DISHWASHER:
            return IndoorAmenity.DISHWASHER;
          case LegacyKitchenAmenity.REFRIGERATOR_ICE_MAKER:
            return IndoorAmenity.ICE_MAKER;
          case LegacyKitchenAmenity.WASHING_MACHINE:
            return IndoorAmenity.WASHING_MACHINE;
          default:
            return undefined;
        }
      })
      .filter(indoorAmenity => indoorAmenity !== undefined) as IndoorAmenity[];
    const bathroomAmenities = (input.bathroom_amenities || [])
      .map(bathroomAmenity => {
        switch (bathroomAmenity) {
          case LegacyBathroomAmenity.BATHTUB:
            return IndoorAmenity.BATHTUB;
          case LegacyBathroomAmenity.HOT_TUB:
          case LegacyBathroomAmenity.SPA:
            return IndoorAmenity.HOT_TUB;
          default:
            return undefined;
        }
      })
      .filter(indoorAmenity => indoorAmenity !== undefined) as IndoorAmenity[];

    return [...kitchenAmenities, ...bathroomAmenities];
  },
  outdoorAmenities: (input: LocationRecordData) => {
    if (input.profile !== undefined && !_.isEmpty(input.profile.outdoor_amenities)) {
      return input.profile.outdoor_amenities;
    }

    return (input.outdoor_amenities || [])
      .map(outdoorAmenity => {
        switch (outdoorAmenity) {
          case LegacyOutdoorAmenity.SWIMMING_POOL:
            return OutdoorAmenity.POOL;
          case LegacyOutdoorAmenity.FOUNTAIN:
            return OutdoorAmenity.FOUNTAIN;
          case LegacyOutdoorAmenity.SPA:
          case LegacyOutdoorAmenity.HOT_TUB:
            return OutdoorAmenity.HOT_TUB;
          default:
            return undefined;
        }
      })
      .filter(outdoorAmenity => outdoorAmenity !== undefined) as OutdoorAmenity[];
  },
  plumbingAppliances: (input: LocationRecordData) => {
    if (input.profile !== undefined && !_.isEmpty(input.profile.plumbing_applicances)) {
      return input.profile.plumbing_applicances;
    }

    return [
      input.hot_water_recirculation === NoYesUnsure.Numeric.YES &&
        PlumbingAppliance.RECIRCULATION_PUMP,
      input.water_filtering_system === NoYesUnsure.Numeric.YES &&
        PlumbingAppliance.WHOLE_HOME_FILTRATION,
      input.tankless === NoYesUnsure.Numeric.YES &&
        PlumbingAppliance.TANKLESS_WATER_HEATER,
      input.expansion_tank === NoYesUnsure.Numeric.YES &&
        PlumbingAppliance.EXPANSION_TANK,
      input.whole_house_humidifier === NoYesUnsure.Numeric.YES &&
        PlumbingAppliance.WHOLE_HOME_HUMIDIFIER
    ]
    .filter(plumbingAppliance => plumbingAppliance) as PlumbingAppliance[];
  },
  pastWaterDamageClaimAmount: 'profile.past_water_damage_claim_amount',
  waterUtility: 'profile.water_utility',
  notifications: () => undefined,
  areas: (input: LocationRecordData) => ({
    default: [],
    custom: input.areas || []
  }),
  class: (input: LocationRecordData) => ({
    key: input.location_class || '',
    level: -1
  }),
  metrics: () => undefined,
  _mergedIntoLocationId: '_merged_into_location_id',
  geoLocation: 'geo_positioning'
};

const ModelToRecordSchema: StrictSchema<LocationRecordData, Location> = {
  location_id: 'id',
  parent_location_id: (input: Location) => {
    return input.parent ? input.parent.id : undefined;
  },
  account_id: 'account.id',
  address: 'address',
  address2: 'address2',
  city: 'city',
  state: 'state',
  country: 'country',
  postalcode: 'postalCode',
  timezone: 'timezone',
  gallons_per_day_goal: 'gallonsPerDayGoal',
  occupants: 'occupants',
  stories: 'stories',
  is_profile_complete: 'isProfileComplete',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  location_name: 'nickname',
  target_system_mode: 'systemMode.target',
  revert_minutes: 'systemMode.revertMinutes',
  revert_mode: 'systemMode.revertMode',
  revert_scheduled_at: 'systemMode.revertScheduledAt',
  is_irrigation_schedule_enabled: 'irrigationSchedule.isEnabled',
  profile: (input: Partial<Location>) => {
    return {
      location_type: input.locationType,
      residence_type: input.residenceType,
      water_source: input.waterSource,
      location_size: input.locationSize,
      shower_bath_count: input.showerBathCount,
      toilet_count: input.toiletCount,
      water_shutoff_known: translateStringToNumericEnum(
        NoYesUnsure.Numeric,
        NoYesUnsure.String,
        input.waterShutoffKnown,
        'UNSURE'
      ) || NoYesUnsure.Numeric.UNSURE,
      plumbing_type: input.plumbingType,
      indoor_amenities: (input.indoorAmenities || []),
      outdoor_amenities: (input.outdoorAmenities || []),
      plumbing_applicances: (input.plumbingAppliances || []),
      home_owners_insurance: input.homeownersInsurance,
      has_past_water_damage: input.hasPastWaterDamage || false,
      past_water_damage_claim_amount: input.pastWaterDamageClaimAmount,
      water_utility: input.waterUtility
    };
  },
  areas: (input: Partial<Location>) => _.get(input, 'areas.custom', []),
  location_class: 'class.key',
  _merged_into_location_id: '_mergedIntoLocationId',
  geo_positioning: 'geoLocation'
};

export type PartialLocationRecordData = Omit<LocationRecordData, 'profile'> & Record<'profile', Partial<LocationRecordData['profile']>>;

const PartialModelToPartialRecordSchema: StrictSchema<PartialLocationRecordData, Partial<Location>> = {
  location_id: 'id',
  parent_location_id: (input: Partial<Location>) => {
    return input.parent ? input.parent.id : undefined;
  },
  account_id: 'account.id',
  address: 'address',
  address2: 'address2',
  city: 'city',
  state: 'state',
  country: 'country',
  postalcode: 'postalCode',
  timezone: 'timezone',
  gallons_per_day_goal: 'gallonsPerDayGoal',
  occupants: 'occupants',
  stories: 'stories',
  is_profile_complete: 'isProfileComplete',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  location_name: 'nickname',
  target_system_mode: 'systemMode.target',
  revert_minutes: 'systemMode.revertMinutes',
  revert_mode: 'systemMode.revertMode',
  revert_scheduled_at: 'systemMode.revertScheduledAt',
  is_irrigation_schedule_enabled: 'irrigationSchedule.isEnabled',
  profile: (input: Partial<Location>) => {
    return {
      location_type: input.locationType,
      residence_type: input.residenceType,
      water_source: input.waterSource,
      location_size: input.locationSize,
      shower_bath_count: input.showerBathCount,
      toilet_count: input.toiletCount,
      water_shutoff_known: translateStringToNumericEnum(
        NoYesUnsure.Numeric,
        NoYesUnsure.String,
        input.waterShutoffKnown,
        'UNSURE'
      ) || NoYesUnsure.Numeric.UNSURE,
      plumbing_type: input.plumbingType,
      indoor_amenities: input.indoorAmenities && input.indoorAmenities,
      outdoor_amenities: input.outdoorAmenities && input.outdoorAmenities,
      plumbing_applicances: input.plumbingAppliances && input.plumbingAppliances,
      home_owners_insurance: input.homeownersInsurance,
      has_past_water_damage: input.hasPastWaterDamage,
      past_water_damage_claim_amount: input.pastWaterDamageClaimAmount,
      water_utility: input.waterUtility
    };
  },
  areas: (input: Partial<Location>) => _.get(input, 'areas.custom', undefined) || [],
  location_class: 'class.key',
  _merged_into_location_id: '_mergedIntoLocationId',
  geo_positioning: 'geoLocation'
};


export class LocationRecord {

  public static fromModel(location: Location): LocationRecordData {
    return morphism(ModelToRecordSchema, location) as LocationRecordData;
  }

  public static fromPartialModel(location: Partial<Location>): PartialLocationRecordData {
    const record = morphism(PartialModelToPartialRecordSchema, location);

    return record;
  }

  constructor(
    public data: LocationRecordData
  ) {}

  public toModel(): Location {

    return morphism(RecordToModelSchema, this.data);
  }
}
