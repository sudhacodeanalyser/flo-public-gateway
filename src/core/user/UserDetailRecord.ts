export enum UnitSystem {
  IMPERIAL_US = 'imperial_us',
  METRIC_KPA = 'metric_kpa'
}

export default interface UserDetailRecord {
  user_id: string,
  firstname?: string,
  middlename?: string,
  lastname?: string,
  prefixname?: string,
  suffixname?: string,
  unit_system?: UnitSystem // Measurement unit prefence (e.g. metric vs freedom units)
  phone_mobile?: string
}