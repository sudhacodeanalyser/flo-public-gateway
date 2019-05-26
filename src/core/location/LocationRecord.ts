import _ from 'lodash';
import { 
  Omit,
  Location, 
  LocationCodec, 
  Timestamped, 
  LocationType, 
  WaterSource, 
  ResidenceType,
  WaterDamageClaim,
  PlumbingType,
  IndoorAmenity,
  OutdoorAmenity,
  PlumbingAppliance,
  LocationSize
} from '../api';
import { NoYesUnsure } from '../api/NoYesUnsure';
import { morphism, StrictSchema } from 'morphism';
import { translateNumericToStringEnum, translateStringToNumericEnum } from '../api/enumUtils';

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
  REFRIDGERATOR_ICE_MAKER = 'Fridge with Ice Maker'
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
  location_type?: LocationTypeData,
  residence_type?: ResidenceTypeData,
  water_source?: WaterSourceData,
  location_size?: LocationSizeData,
  shower_bath_count?: number,
  toilet_count?: number,
  water_shutoff_known: NoYesUnsure.Numeric,
  plumbing_type?: PlumbingTypeData,
  indoor_amenities: IndoorAmenityData[],
  outdoor_amenities: OutdoorAmenityData[],
  plumbing_applicances: PlumbingApplicanceData[],
  home_owners_insurance?: string,
  has_past_water_damage: boolean,
  past_water_damage_claim_amount?: WaterDamageClaimData
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

const RecordToModelSchema: StrictSchema<Location, LocationRecordData> = {
  id: 'location_id',
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
  timezone: 'timezone',
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
  locationType: (input: LocationRecordData) => {
    if (input.profile !== undefined && input.profile.location_type !== undefined) {
      return translateNumericToStringEnum(
        LocationType,
        LocationTypeData,
        input.profile.location_type
      );
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
  residenceType: (input: LocationRecordData) => {
    return input.profile && input.profile.residence_type !== undefined ? 
      translateNumericToStringEnum(
        ResidenceType,
        ResidenceTypeData,
        input.profile.residence_type
      ) :
      undefined;
  },
  waterSource: (input: LocationRecordData) => {
    return input.profile && input.profile.water_source &&
      translateNumericToStringEnum(
        WaterSource, 
        WaterSourceData, 
        input.profile.water_source
      );
  },
  locationSize: (input: LocationRecordData) => {
    if (input.profile && input.profile.location_size) {
      return translateNumericToStringEnum(
        LocationSize,
        LocationSizeData,
        input.profile.location_size
      );
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
      return translateNumericToStringEnum(
        PlumbingType, 
        PlumbingTypeData, 
        input.profile.plumbing_type
       );
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
      return input.profile.indoor_amenities
        .map(indoorAmenity => 
          translateNumericToStringEnum(
            IndoorAmenity, 
            IndoorAmenityData, 
            indoorAmenity
          )
        )
        .filter(indoorAmenity => indoorAmenity !== undefined) as IndoorAmenity[];
    } 

    const kitchenAmenities = (input.kitchen_amenities || [])
      .map(kitchenAmenity => {
        switch (kitchenAmenity) {
          case LegacyKitchenAmenity.DISHWASHER:
            return IndoorAmenity.DISHWASHER;
          case LegacyKitchenAmenity.REFRIDGERATOR_ICE_MAKER:
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
      return (input.profile.outdoor_amenities || [])
        .map(outdoorAmenity => 
          translateNumericToStringEnum(
            OutdoorAmenity, 
            OutdoorAmenityData, 
            outdoorAmenity
          )
        )
        .filter(outdoorAmenity => outdoorAmenity !== undefined) as OutdoorAmenity[];
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
      return (input.profile.plumbing_applicances || [])
        .map(plumbingAppliance => 
          translateNumericToStringEnum(
            PlumbingAppliance,
            PlumbingApplicanceData,
            plumbingAppliance
          )
        )
        .filter(plumbingAppliance => plumbingAppliance !== undefined) as PlumbingAppliance[];
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
  pastWaterDamageClaimAmount: (input: LocationRecordData) => {
    return input.profile && input.profile.past_water_damage_claim_amount && 
      translateNumericToStringEnum(
        WaterDamageClaim, 
        WaterDamageClaimData, 
        input.profile.past_water_damage_claim_amount
      );
  }
};

const ModelToRecordSchema: StrictSchema<LocationRecordData, Location> = {
  location_id: 'id',
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
  profile: (input: Partial<Location>) => {
    return {
      location_type: translateStringToNumericEnum(
        LocationTypeData,
        LocationType,
        input.locationType
      ),
      residence_type: translateStringToNumericEnum(
        ResidenceTypeData,
        ResidenceType,
        input.residenceType
      ),
      water_source: translateStringToNumericEnum(
        WaterSourceData,
        WaterSource,
        input.waterSource
      ),
      location_size: translateStringToNumericEnum(
        LocationSizeData,
        LocationSize,
        input.locationSize
      ),
      shower_bath_count: input.showerBathCount,
      toilet_count: input.toiletCount,
      water_shutoff_known: translateStringToNumericEnum(
        NoYesUnsure.Numeric,
        NoYesUnsure.String,
        input.waterShutoffKnown,
        'UNSURE'
      ) || NoYesUnsure.Numeric.UNSURE,
      plumbing_type: translateStringToNumericEnum(
        PlumbingTypeData,
        PlumbingType,
        input.plumbingType
      ),
      indoor_amenities: (input.indoorAmenities || [])
        .map(indoorAmenity => 
          translateStringToNumericEnum(
            IndoorAmenityData,
            IndoorAmenity,
            indoorAmenity
          )
        )
        .filter(indoorAmenity => indoorAmenity !== undefined) as IndoorAmenityData[],
      outdoor_amenities: (input.outdoorAmenities || [])
        .map(outdoorAmenity => 
          translateStringToNumericEnum(
            OutdoorAmenityData,
            OutdoorAmenity,
            outdoorAmenity
          )
        )
        .filter(outdoorAmenity => outdoorAmenity !== undefined) as OutdoorAmenityData[],
      plumbing_applicances: (input.plumbingAppliances || [])
        .map(plumbingAppliance => 
          translateStringToNumericEnum(
            PlumbingApplicanceData,
            PlumbingAppliance,
            plumbingAppliance
          )
        )
        .filter(plumbingAppliance => plumbingAppliance !== undefined) as PlumbingApplicanceData[],
      home_owners_insurance: input.homeownersInsurance,
      has_past_water_damage: input.hasPastWaterDamage || false,
      past_water_damage_claim_amount: translateStringToNumericEnum(
        WaterDamageClaimData,
        WaterDamageClaim,
        input.pastWaterDamageClaimAmount
      ) 
    };
  }
};

export type PartialLocationRecordData = Omit<LocationRecordData, 'profile'> & Record<'profile', Partial<LocationRecordData['profile']>>;

const PartialModelToPartialRecordSchema: StrictSchema<PartialLocationRecordData, Partial<Location>> = {
  location_id: 'id',
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
  profile: (input: Partial<Location>) => {
    return {
      location_type: translateStringToNumericEnum(
        LocationTypeData,
        LocationType,
        input.locationType
      ),
      residence_type: translateStringToNumericEnum(
        ResidenceTypeData,
        ResidenceType,
        input.residenceType
      ),
      water_source: translateStringToNumericEnum(
        WaterSourceData,
        WaterSource,
        input.waterSource
      ),
      location_size: translateStringToNumericEnum(
        LocationSizeData,
        LocationSize,
        input.locationSize
      ),
      shower_bath_count: input.showerBathCount,
      toilet_count: input.toiletCount,
      water_shutoff_known: translateStringToNumericEnum(
        NoYesUnsure.Numeric,
        NoYesUnsure.String,
        input.waterShutoffKnown
      ),
      plumbing_type: translateStringToNumericEnum(
        PlumbingTypeData,
        PlumbingType,
        input.plumbingType
      ),
      indoor_amenities: input.indoorAmenities && input.indoorAmenities
        .map(indoorAmenity => 
          translateStringToNumericEnum(
            IndoorAmenityData,
            IndoorAmenity,
            indoorAmenity
          )
        )
        .filter(indoorAmenity => indoorAmenity !== undefined) as IndoorAmenityData[],
      outdoor_amenities: input.outdoorAmenities && input.outdoorAmenities
        .map(outdoorAmenity => 
          translateStringToNumericEnum(
            OutdoorAmenityData,
            OutdoorAmenity,
            outdoorAmenity
          )
        )
        .filter(outdoorAmenity => outdoorAmenity !== undefined) as OutdoorAmenityData[],
      plumbing_applicances: input.plumbingAppliances && input.plumbingAppliances
        .map(plumbingAppliance => 
          translateStringToNumericEnum(
            PlumbingApplicanceData,
            PlumbingAppliance,
            plumbingAppliance
          )
        )
        .filter(plumbingAppliance => plumbingAppliance !== undefined) as PlumbingApplicanceData[],
      home_owners_insurance: input.homeownersInsurance,
      has_past_water_damage: input.hasPastWaterDamage,
      past_water_damage_claim_amount: translateStringToNumericEnum(
        WaterDamageClaimData,
        WaterDamageClaim,
        input.pastWaterDamageClaimAmount
      ) 
    };
  }
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

