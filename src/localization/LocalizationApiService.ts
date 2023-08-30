import { HttpService } from '../http/HttpService';
import { LocalizationService } from '../core/service';
import { AssetsResponse, LocalesResponse, LocalizedResponse, TypesResponse, BulkLocalizedResponse } from '../core/api/response/Localization';
import { Asset, AssetFilter, LocaleFilter, Locale, LocalizedFilter, TypeFilter } from '../core/api/model/Localization';
import { inject } from 'inversify';
import * as _ from 'lodash';

class LocalizationApiService extends HttpService implements LocalizationService {

  constructor(@inject('LocalizationApiUrl') private readonly localizationApiUrl: string) {
    super();
  }

  public async getAssets(filter: AssetFilter): Promise<AssetsResponse> {
    const request = {
      method: 'GET',
      url: `${ this.localizationApiUrl }/assets`,
      params: {
        ...filter
      }
    };

    const result: AssetsResponse = await this.sendRequest(request);

    if (!result || !result.items || !result.items.length) {
      return this.sendRequest({
        method: 'GET',
        url: `${ this.localizationApiUrl }/assets`,
        params: {
          ...filter,
          locale: 'en-us'
        }
      });
    }

    return result;
  }

  public async createAsset(asset: Asset): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiUrl }/assets`,
      body: {
        ...asset
      }
    };

    return this.sendRequest(request);
  }

  public async getAssetById(id: string): Promise<Asset> {
    const request = {
      method: 'GET',
      url: `${ this.localizationApiUrl }/assets/${id}`,
    };

    return this.sendRequest(request);
  }

  public async updateAsset(id: string, asset: Asset): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiUrl }/assets/${id}`,
      body: {
        ...asset,
        id
      }
    };

    return this.sendRequest(request);
  }

  public async deleteAsset(id: string): Promise<void> {
    const request = {
      method: 'DELETE',
      url: `${ this.localizationApiUrl }/assets/${id}`,
    };

    return this.sendRequest(request);
  }

  public async getLocales(filter: LocaleFilter): Promise<LocalesResponse> {
    const request = {
      method: 'GET',
      url: `${ this.localizationApiUrl }/locales`,
      params: {
        ...filter
      }
    };

    return this.sendRequest(request);
  }

  public async createLocale(locale: Locale): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiUrl }/locales`,
      body: {
        ...locale
      }
    };

    return this.sendRequest(request);
  }

  public async getLocaleById(id: string): Promise<Locale> {
    const request = {
      method: 'GET',
      url: `${ this.localizationApiUrl }/locales/${id}`,
    };

    return this.sendRequest(request);
  }

  public async updateLocale(id: string, locale: Locale): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiUrl }/locales/${id}`,
      body: {
        ...locale,
        id
      }
    };

    return this.sendRequest(request);
  }

  public async deleteLocale(id: string): Promise<void> {
    const request = {
      method: 'DELETE',
      url: `${ this.localizationApiUrl }/locales/${id}`,
    };

    return this.sendRequest(request);
  }

  public async getLocalizedValue(filter: LocalizedFilter, caching?: string): Promise<LocalizedResponse> {
    const args = _.mapKeys(filter.args, (value, key) => `args.${ key }`);
    delete filter.args;
    const request = {
      method: 'GET',
      url: `${ this.localizationApiUrl }/localized`,
      params: {
        ...filter,
        ...args,
        caching
      }
    };

    return this.sendRequest(request);
  }

  public async getLocalizedValues(filter: { items: LocalizedFilter[] }, caching: string): Promise<BulkLocalizedResponse> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiUrl }/localized`,
      params: {
        caching
      },
      body: {
        ...filter
      }
    };

    return this.sendRequest(request);
  }

  public async getTypes(filter: TypeFilter): Promise<TypesResponse> {
    const request = {
      method: 'GET',
      url: `${ this.localizationApiUrl }/types`,
      params: {
        ...filter
      }
    };

    return this.sendRequest(request);
  }
}

export { LocalizationApiService }