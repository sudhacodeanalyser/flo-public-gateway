import { HttpService } from "../http/HttpService";
import { LocalizationService } from "../core/service";
import { AssetsResponse, LocalesResponse, LocalizedResponse } from "../core/api/response/Localization";
import { Asset, AssetFilter, LocaleFilter, Locale, LocalizedFilter } from "../core/api/model/Localization";
import { inject } from "inversify";

class LocalizationApiService extends HttpService implements LocalizationService {

  constructor(@inject('LocalizationApiV1Url') private readonly localizationApiV1Url: string) {
    super();
  }

  public async getAssets(filter: AssetFilter): Promise<AssetsResponse> {
    const request = {
      method: 'GET',
      url: `${ this.localizationApiV1Url }/assets`,
      params: {
        ...filter
      }
    };

    return this.sendRequest(request);
  }

  public async createAsset(asset: Asset): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiV1Url }/assets`,
      body: {
        ...asset
      }
    };

    return this.sendRequest(request);
  }

  public async getAssetById(id: string): Promise<Asset> {
    const request = {
      method: 'GET',
      url: `${ this.localizationApiV1Url }/assets/${id}`,
    };

    return this.sendRequest(request);
  }

  public async updateAsset(id: string, asset: Asset): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiV1Url }/assets/${id}`,
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
      url: `${ this.localizationApiV1Url }/assets/${id}`,
    };

    return this.sendRequest(request);
  }

  public async getLocales(filter: LocaleFilter): Promise<LocalesResponse> {
    const request = {
      method: 'GET',
      url: `${ this.localizationApiV1Url }/locales`,
      params: {
        ...filter
      }
    };

    return this.sendRequest(request);
  }

  public async createLocale(locale: Locale): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiV1Url }/locales`,
      body: {
        ...locale
      }
    };

    return this.sendRequest(request);
  }

  public async getLocaleById(id: string): Promise<Locale> {
    const request = {
      method: 'GET',
      url: `${ this.localizationApiV1Url }/locales/${id}`,
    };

    return this.sendRequest(request);
  }

  public async updateLocale(id: string, locale: Locale): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiV1Url }/locales/${id}`,
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
      url: `${ this.localizationApiV1Url }/locales/${id}`,
    };

    return this.sendRequest(request);
  }

  public async getLocalizedValue(filter: LocalizedFilter, caching: string): Promise<LocalizedResponse> {
    const args = Object.assign({}, ...Object.keys(filter.args).map(key => ({ [`args.${key}`]: filter.args[key] })));
    delete filter.args;
    const request = {
      method: 'GET',
      url: `${ this.localizationApiV1Url }/localized`,
      params: {
        ...filter,
        ...args,
        caching
      }
    };

    return this.sendRequest(request);
  }

  public async getLocalizedValues(filter: { items: LocalizedFilter[] }, caching: string): Promise<LocalizedResponse> {
    const request = {
      method: 'POST',
      url: `${ this.localizationApiV1Url }/localized`,
      params: {
        caching
      },
      body: {
        ...filter
      }
    };

    return this.sendRequest(request);
  }
}

export { LocalizationApiService }