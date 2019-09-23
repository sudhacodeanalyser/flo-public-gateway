import { AssetsResponse, LocalesResponse, LocalizedResponse, TypesResponse, BulkLocalizedResponse } from '../api/response/Localization';
import { Asset, AssetFilter, LocaleFilter, Locale, LocalizedFilter, TypeFilter } from '../api/model/Localization';

export interface LocalizationService {
  getAssets(filter: AssetFilter): Promise<AssetsResponse>
  createAsset(asset: Asset): Promise<void>
  getAssetById(id: string): Promise<Asset>
  updateAsset(id: string, asset: Asset): Promise<void>
  deleteAsset(id: string): Promise<void>
  getLocales(filter: LocaleFilter): Promise<LocalesResponse>
  createLocale(locale: Locale): Promise<void>
  getLocaleById(id: string): Promise<Locale>
  updateLocale(id: string, locale: Locale): Promise<void>
  deleteLocale(id: string): Promise<void>
  getLocalizedValue(filter: LocalizedFilter, caching?: string): Promise<LocalizedResponse>
  getLocalizedValues(filter: { items: LocalizedFilter[] }, caching: string): Promise<BulkLocalizedResponse>
  getTypes(filter: TypeFilter): Promise<TypesResponse>
}
