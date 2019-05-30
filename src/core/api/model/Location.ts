import { Omit, Expandable, TimestampedModel, User, Account, Device, Subscription } from '../../api';
import { NoYesUnsure } from '../NoYesUnsure';
import { convertEnumtoCodec } from '../enumUtils';
import * as t from 'io-ts';
import _ from 'lodash'

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
  LTE_700_FT = 'lte_700',
  GT_700_FT_LTE_1000_FT = 'gt_700_ft_lte_1000_ft',
  GT_1000_FT_LTE_2000_FT = 'gt_1000_ft_lte_2000_ft',
  GT_2000_FT_LTE_4000_FT = 'gt_2000_ft_lte_4000_ft',
  GT_4000_FT = 'gt_4000_ft'
}
export const LocationSizeCodec = convertEnumtoCodec(LocationSize);

export enum PlumbingType {
  COPPER = 'copper',
  GALVANIZED = 'galvanized'
}
export const PlumbingTypeCodec = convertEnumtoCodec(PlumbingType);

export enum IndoorAmenity {
  BATHTUB = 'bathtub',
  HOT_TUB = 'hot_tub',
  WASHING_MACHINE = 'washing_machine',
  DISHWASHER = 'dishwasher',
  ICE_MAKER = 'ice_maker'
}
export const IndoorAmenityCodec = convertEnumtoCodec(IndoorAmenity);

export enum OutdoorAmenity {
  POOL = 'pool',
  POOL_AUTO_FILL = 'pool_auto_fill',
  HOT_TUB = 'hot_tub',
  FOUNTAIN = 'fountain',
  POND = 'pond'
}
export const OutdoorAmenityCodec = convertEnumtoCodec(OutdoorAmenity);

export enum PlumbingAppliance {
  TANKLESS_WATER_HEATER = 'tankless_water_heater',
  EXPANSION_TANK = 'expansion_tank',
  WHOLE_HOME_FILTRATION = 'whole_home_filtration',
  WHOLE_HOME_HUMIDIFIER = 'whole_home_humidifer',
  RECIRCULATION_PUMP = 'recirculation_pump',
  REVERSE_OSMOSIS = 'reverse_osmosis',
  WATER_SOFTENER = 'water_softener',
  PRESSURE_REDUCING_VALVE = 'pressure_reducing_valve'
}
export const PlumbingApplicanceCodec = convertEnumtoCodec(PlumbingAppliance);

export enum WaterDamageClaim {
  LTE_10K_USD = 'lte_10k_usd',
  GT_10K_USD_LTE_50K_USD = 'gt_10k_usd_lte_50k_usd',
  GT_50K_USD_LTE_100K_USD = 'gt_50k_usd_lte_100k_usd',
  GT_100K_USD = 'gt_100K_usd'
}
export const WaterDamageClaimCodec = convertEnumtoCodec(WaterDamageClaim);

// These properties have corresponding legacy properties
const LocationProfileWithLegacyCodec = t.type({
  waterShutoffKnown: NoYesUnsure.Codec,
  indoorAmenities: t.array(IndoorAmenityCodec),
  outdoorAmenities: t.array(OutdoorAmenityCodec),
  plumbingAppliances: t.array(PlumbingApplicanceCodec),
  gallonsPerDayGoal: t.number,
  occupants: t.union([t.Int, t.undefined]),
  stories: t.union([t.Int, t.undefined]),
  isProfileComplete: t.union([t.boolean, t.undefined])
});

const LocationProfileCodec = t.type({
  locationType: LocationTypeCodec,
  residenceType: ResidenceTypeCodec,
  waterSource: WaterSourceCodec,
  locationSize: LocationSizeCodec,
  showerBathCount: t.Int,
  toiletCount: t.Int,
  plumbingType: t.union([PlumbingTypeCodec, t.undefined]),
  homeownersInsurance: t.union([t.string, t.undefined]),
  hasPastWaterDamage: t.boolean,
  pastWaterDamageClaimAmount: t.union([WaterDamageClaimCodec, t.undefined])
});

const AddressCodec = t.type({
  address: t.string,
  address2: t.union([t.string, t.undefined]),
  city: t.string,
  state: t.string,
  country: t.string,
  postalCode: t.string,
  timezone: t.string
});

const NicknameCodec = t.type({
  nickname: t.union([t.string, t.undefined])
})

const LocationMutableCodec = t.intersection([
  LocationProfileWithLegacyCodec,
  LocationProfileCodec,
  AddressCodec,
  NicknameCodec
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
} = LocationProfileCodec.props

export const LocationCreateValidator = t.intersection([
  AccountId,
  AddressCodec,
  t.intersection([
    t.type({
      locationType,
      residenceType,
    }),
    // Can't have more than 5 types in an intersection with the compiler complaining
    NicknameCodec
  ]),
  t.partial(profileProps as Omit<typeof LocationProfileCodec.props, 'locationType' | 'residenceType'>),
  t.partial(LocationProfileWithLegacyCodec.props)
]);
// These must be explicitly flattened by index without using .map(...), otherwise the
// resulting type will be any
const mutableProps = {
  ...LocationMutableCodec.types[0].props, 
  ...LocationMutableCodec.types[1].props,
  ...LocationMutableCodec.types[2].props
};
export const LocationUpdateValidator = t.exact(t.partial(mutableProps));
export type LocationUpdate = t.TypeOf<typeof LocationUpdateValidator>;

export const LocationCreateValidator = t.intersection([
  AccountId,
  AddressCodec,
  t.intersection([
    t.type({
      locationType,
      residenceType,
    }),
    // Can't have more than 5 types in an intersection with the compiler complaining
    NicknameCodec
  ]),
  t.partial(profileProps as Omit<typeof LocationProfileCodec.props, 'locationType' | 'residenceType'>),
  t.partial(LocationProfileWithLegacyCodec.props)
]);
export type LocationCreate = t.TypeOf<typeof LocationCreateValidator>;

// These must be explicitly flattened by index without using .map(...), otherwise the
// resulting type will be any
const mutableProps = {
  ...LocationMutableCodec.types[0].props, 
  ...LocationMutableCodec.types[1].props,
  ...LocationMutableCodec.types[2].props
};
export const LocationUpdateValidator = t.exact(t.partial(mutableProps));
    t.type({

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
    NicknameCodec,
    t.type({
      id: t.string,
      users: t.array(ExpandableCodec),
      userRoles: t.array(LocationUserRoleCodec),
      devices: t.array(ExpandableCodec),
      subscription: t.union([ExpandableCodec, t.undefined])
    })
  ])
]);

export interface Location extends t.TypeOf<typeof LocationCodec>, TimestampedModel {}