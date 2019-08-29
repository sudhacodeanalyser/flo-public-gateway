import * as t from 'io-ts';
import { NotificationStatistics, Omit, TimestampedModel } from '../../api';
import { NonEmptyString } from '../../api/validator/NonEmptyString';
import { convertEnumtoCodec } from '../enumUtils';
import { NoYesUnsure } from '../NoYesUnsure';

export const LocationUserRoleCodec = t.type({
  userId: t.string,
  roles: t.array(t.string)
});

export type LocationUserRole = t.TypeOf<typeof LocationUserRoleCodec>;

export enum LocationType {
  OTHER = 'other',
  SFH = 'sfh',
  APARTMENT = 'apartment',
  CONDO = 'condo',
  VACATION = 'vacation'
}
export const LocationTypeCodec = convertEnumtoCodec(LocationType);

export enum ResidenceType {
  OTHER = 'other',
  PRIMARY = 'primary',
  RENTAL = 'rental',
  VACATION  = 'vacation'
}
export const ResidenceTypeCodec = convertEnumtoCodec(ResidenceType);

export enum WaterSource {
  UTILITY = 'utility',
  WELL = 'well'
}
export const WaterSourceCodec = convertEnumtoCodec(WaterSource);

export enum LocationSize {
  LTE_700_FT = 'lt_700_sq_ft',
  GT_700_FT_LTE_1000_FT = 'lte_1000_sq_ft',
  GT_1000_FT_LTE_2000_FT = 'lte_2000_sq_ft',
  GT_2000_FT_LTE_4000_FT = 'lte_4000_sq_ft',
  GT_4000_FT = 'gt_4000_sq_ft'
}
export const LocationSizeCodec = convertEnumtoCodec(LocationSize);

export enum PlumbingType {
  COPPER = 'copper',
  GALVANIZED = 'galvanized'
}

export const PlumbingTypeCodec = convertEnumtoCodec(PlumbingType);

export enum IndoorAmenity {
  BATHTUB = 'bathtub',
  HOT_TUB = 'hottub',
  WASHING_MACHINE = 'clotheswasher',
  DISHWASHER = 'dishwasher',
  ICE_MAKER = 'icemaker_ref'
}
export const IndoorAmenityCodec = convertEnumtoCodec(IndoorAmenity);

export enum OutdoorAmenity {
  POOL = 'pool',
  POOL_AUTO_FILL = 'pool_filter',
  HOT_TUB = 'hottub',
  FOUNTAIN = 'fountain',
  POND = 'pond'
}
export const OutdoorAmenityCodec = convertEnumtoCodec(OutdoorAmenity);

export enum PlumbingAppliance {
  TANKLESS_WATER_HEATER = 'tankless',
  EXPANSION_TANK = 'exp_tank',
  WHOLE_HOME_FILTRATION = 'home_filter',
  WHOLE_HOME_HUMIDIFIER = 'home_humidifier',
  RECIRCULATION_PUMP = 're_pump',
  WATER_SOFTENER = 'softener',
  PRESSURE_REDUCING_VALVE = 'prv',
  REVERSE_OSMOSIS = 'rev_osmosis'
}
export const PlumbingApplicanceCodec = convertEnumtoCodec(PlumbingAppliance);

export enum WaterDamageClaim {
  LTE_10K_USD = 'lte_10k_usd',
  GT_10K_USD_LTE_50K_USD = 'lte_50k_usd',
  GT_50K_USD_LTE_100K_USD = 'lte_100k_usd',
  GT_100K_USD = 'gt_100k_usd'
}
export const WaterDamageClaimCodec = convertEnumtoCodec(WaterDamageClaim);

// These properties have corresponding legacy properties
const LocationProfileWithLegacyCodec = t.type({
  waterShutoffKnown: NoYesUnsure.Codec,
  indoorAmenities: t.array(t.string),
  outdoorAmenities: t.array(t.string),
  plumbingAppliances: t.array(t.string),
  gallonsPerDayGoal: t.number,
  occupants: t.union([t.Int, t.undefined]),
  stories: t.union([t.Int, t.undefined]),
  isProfileComplete: t.union([t.boolean, t.undefined])
});

const LocationProfileCodec = t.type({
  locationType: t.string,
  residenceType: t.string,
  waterSource: t.string,
  locationSize: t.string,
  showerBathCount: t.Int,
  toiletCount: t.Int,
  plumbingType: t.union([t.string, t.undefined]),
  homeownersInsurance: t.union([t.string, t.undefined]),
  hasPastWaterDamage: t.boolean,
  pastWaterDamageClaimAmount: t.union([t.string, t.undefined]),
  waterUtility: t.union([t.undefined, t.string])
});

const AddressCodec = t.type({
  address: NonEmptyString,
  address2: t.union([t.string, t.undefined]),
  city: NonEmptyString,
  state: NonEmptyString,
  country: NonEmptyString,
  postalCode: NonEmptyString,
  timezone: NonEmptyString
});

export enum SystemMode {
  HOME = 'home',
  AWAY = 'away',
  SLEEP = 'sleep'
}

export const SystemModeCodec = convertEnumtoCodec(SystemMode);

const AdditionalPropsCodec = t.type({
  nickname: t.union([t.string, t.undefined]),
  irrigationSchedule: t.union([t.undefined, t.type({
    isEnabled: t.boolean
  })])
});

const SystemModeProps = t.type({
  systemMode: t.union([t.undefined, t.partial({
    target: SystemModeCodec,
    revertMinutes: t.number,
    revertMode: SystemModeCodec,
    revertScheduledAt: t.string
  })])
});

const LocationMutableCodec = t.intersection([
  LocationProfileWithLegacyCodec,
  LocationProfileCodec,
  AddressCodec,
  AdditionalPropsCodec
]);

const AccountId = t.strict({
  account: t.strict({
    id: t.string
  })
})

const {
  locationType,
  residenceType,
  ...profileProps
} = LocationProfileCodec.props;


export const LocationCreateValidator = t.intersection([
  AccountId,
  AddressCodec,
  t.type({
    locationType,
    residenceType,
    nickname: AdditionalPropsCodec.props.nickname
  }),
  t.partial(profileProps as Omit<typeof LocationProfileCodec.props, 'locationType' | 'residenceType'>),
  t.partial(LocationProfileWithLegacyCodec.props)
]);
export type LocationCreate = t.TypeOf<typeof LocationCreateValidator>;

// These must be explicitly flattened by index without using .map(...), otherwise the
// resulting type will be any
const mutableProps = {
  ...LocationMutableCodec.types[0].props,
  ...LocationMutableCodec.types[1].props,
  ...LocationMutableCodec.types[2].props,
  ...LocationMutableCodec.types[3].props
};
export const LocationUpdateValidator = t.exact(t.partial(mutableProps));
export type LocationUpdate = t.TypeOf<typeof LocationUpdateValidator>;

const ExpandableCodec = t.type({
  id: t.string
});


export const LocationCodec = t.intersection([
  AddressCodec,
  LocationProfileWithLegacyCodec,
  t.partial(LocationProfileCodec.props),
  AccountId,
  t.intersection([
    // Can't have more than 5 types in an intersection with the compiler complaining
    AdditionalPropsCodec,
    SystemModeProps,
    t.type({
      id: t.string,
      users: t.array(ExpandableCodec),
      userRoles: t.array(LocationUserRoleCodec),
      devices: t.array(t.intersection([ExpandableCodec, t.partial({ macAddress: t.string })])),
      subscription: t.union([ExpandableCodec, t.undefined])
    })
  ])
]);

export interface Location extends t.TypeOf<typeof LocationCodec>, TimestampedModel {
  notifications?: NotificationStatistics;
}