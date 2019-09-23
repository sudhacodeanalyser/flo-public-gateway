import { Asset, Locale, AssetType } from "../model/Localization";

export interface Meta {
  limit: number,
  offset: number,
  total: number
}

export interface AssetsResponse {
  items: Asset[],
  meta: Meta
}

export interface LocalesResponse {
  items: Locale[],
  meta: Meta
}

export interface LocalizedResponse {
  id: string,
  locale: string,
  localizedValue: string,
  name: string,
  type: string
}

export interface BulkLocalizedResponse {
  items: LocalizedResponse[]
}

export interface TypesResponse {
  items: AssetType[]
}
