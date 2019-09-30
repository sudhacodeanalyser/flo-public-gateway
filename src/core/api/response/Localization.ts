import { Asset, AssetType, Locale } from '../model/Localization';

export interface AssetsMeta {
  limit: number;
  offset: number;
  total: number;
}

export interface LocalizedResponseMeta {
  errorsCount: number;
  itemsCount: number;
  total: number;
}

export interface AssetsResponse {
  items: Asset[];
  meta: AssetsMeta;
}

export interface LocalesResponse {
  items: Locale[];
  meta: AssetsMeta;
}

export interface LocalizedError {
  error: string;
  name: string;
}

export interface LocalizedResponse {
  id: string;
  locale: string;
  localizedValue: string;
  name: string;
  type: string;
}

export interface BulkLocalizedResponse {
  meta: LocalizedResponseMeta;
  items: LocalizedResponse[];
  errors: LocalizedError[];
}

export interface TypesResponse {
  items: AssetType[];
}
