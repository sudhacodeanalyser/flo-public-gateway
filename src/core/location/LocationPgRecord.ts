import { 
  IndoorAmenity, 
  Location, 
  LocationSize, 
  LocationType, 
  OutdoorAmenity, 
  PlumbingAppliance, 
  PlumbingType,
  ResidenceType,
  WaterSource,
  SystemMode
} from '../api';
import { NoYesUnsure } from '../api/NoYesUnsure';
import * as _ from 'lodash';
import { morphism, StrictSchema } from 'morphism';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { NonEmptyString } from '../api/validator/NonEmptyString';
import { translateNumericToStringEnum } from '../api/enumUtils';

interface AreaRecord {
  id: string;
  name: string;
}

export enum SystemModeNumeric {
  HOME = 2,
  AWAY = 3,
  SLEEP = 5
}


type Integer = number;

export interface LocationPgRecordData {
  id: string;
  parent_location_id?: string | null;
  account_id: string;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  country?: string| null;
  postal_code?: string | null;
  timezone?: string | null;
  gallons_per_day_goal?: Integer | null;
  occupants?: Integer | null;
  stories?: Integer | null;
  is_profile_complete: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  home_owners_insurance?: string | null;
  has_past_water_damage?: boolean | null;
  toilet_count?: Integer | null;
  shower_bath_count?: Integer | null;
  nickname?: string | null;
  is_irrigation_schedule_enabled?: boolean | null;
  system_mode_target?: SystemModeNumeric | null;
  system_mode_revert_minutes?: Integer | null;
  system_mode_revert_mode?: SystemModeNumeric | null;
  system_mode_revert_scheduled_at?: string | Date | null;
  type?: string | null;
  residence_type?: ResidenceType | null;
  water_source?: WaterSource | null;
  location_size?: string | null;
  water_shutoff_known?: NoYesUnsure.Numeric | null;
  plumbing_type?: string | null;
  indoor_amenities?: string[] | null;
  outdoor_amenities?: string[] | null;
  plumbing_appliances?: string[] | null;
  past_water_damage_claim_amount?: string | null;
  water_utility?: string | null;
  areas?: AreaRecord[] | null;
  location_class?: string | null;
}

const RecordToModelSchema: StrictSchema<Location, LocationPgRecordData> = {
  id: 'id',
  parent: (input: LocationPgRecordData) => {
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
  postalCode: 'postal_code',
  timezone: (input: LocationPgRecordData) =>
    pipe(
      NonEmptyString.decode(input.timezone || 'America/New_York'), // For Sebastien
      Either.fold(
        () => { throw Error('Invalid timezone value.'); }, // Theoretically unreachable
        result => result
      )
    ),
  gallonsPerDayGoal: 'gallons_per_day_goal',
  occupants: 'occupants',
  stories: 'stories',
  isProfileComplete: 'is_profile_complete',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  homeownersInsurance: 'home_owners_insurance',
  hasPastWaterDamage: 'has_past_water_damage',
  showerBathCount: 'shower_bath_count',
  toiletCount: 'toilet_count',
  nickname: (input: LocationPgRecordData) => {
    return input.nickname || input.address || undefined;
  },
  irrigationSchedule: (input: LocationPgRecordData) =>
    input.is_irrigation_schedule_enabled === undefined || input.is_irrigation_schedule_enabled === null ?
      undefined :({
        isEnabled: !!input.is_irrigation_schedule_enabled
      }),
  systemMode: (input: LocationPgRecordData) => ({
    target: input.system_mode_target ? 
      translateNumericToStringEnum(SystemMode, SystemModeNumeric, input.system_mode_target) : 
      undefined,
    revertMinutes: input.system_mode_revert_minutes || undefined,
    revertMode: input.system_mode_revert_mode ? 
      translateNumericToStringEnum(SystemMode, SystemModeNumeric, input.system_mode_revert_mode) : 
      undefined,
    revertScheduledAt: input.system_mode_revert_scheduled_at ?
      new Date(input.system_mode_revert_scheduled_at).toISOString() :
      undefined
  }),
  locationType: (input: LocationPgRecordData) => {
    return input.type || undefined;
  },
  residenceType: 'residence_type',
  waterSource: 'water_source',
  locationSize: 'location_size',
  waterShutoffKnown: 'water_shutoff_known',
  plumbingType: 'plumbing_type',
  indoorAmenities: (input: LocationPgRecordData) => {
    return input.indoor_amenities || [];
  },
  outdoorAmenities: (input: LocationPgRecordData) => {
    return input.outdoor_amenities || [];
  },
  plumbingAppliances: (input: LocationPgRecordData) => {
    return input.plumbing_appliances || [];
  },
  pastWaterDamageClaimAmount: 'past_water_damage_claim_amount',
  waterUtility: 'water_utility',
  notifications: () => undefined,
  areas: (input: LocationPgRecordData) => ({
    default: [],
    custom: input.areas || []
  }),
  class: (input: LocationPgRecordData) => ({
    key: input.location_class || '',
    level: -1
  }),
  metrics: () => undefined
};

export class LocationPgRecord {
  public static toModel(record: LocationPgRecordData): Location {
    const optionalProps: Array<keyof Location> = [
      'address',
      'address2',
      'city',
      'state',
      'postalCode',
      'country',
      'timezone',
      'occupants',
      'stories',
      'homeownersInsurance',
      'hasPastWaterDamage',
      'showerBathCount',
      'toiletCount',
      'residenceType',
      'waterSource',
      'locationSize',
      'waterShutoffKnown',
      'plumbingType',
      'pastWaterDamageClaimAmount',
      'waterUtility'
    ];
    const location = morphism(RecordToModelSchema, record);

    return _.pickBy(
      location, 
      (value, key) => optionalProps.indexOf(key as keyof Location) >= 0 && value === null ? false : true
    ) as Location;
  }
}

export interface LocationPgPage {
  total: number;
  page: number;
  items: LocationPgRecordData[]
}

export interface LocationFacetPgPage {
  name: string;
  total: number;
  page: number;
  items: string[];
}