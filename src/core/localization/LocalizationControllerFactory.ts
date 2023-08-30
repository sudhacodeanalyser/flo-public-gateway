import * as _ from 'lodash';
import express from 'express';
import { interfaces, httpGet, queryParam, requestParam, requestBody, BaseHttpController, httpPost, httpDelete, request } from 'inversify-express-utils';
import { inject, Container } from 'inversify';
import { LocalizationService } from '../service';
import { httpController } from '../api/controllerUtils';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import { AssetsResponse, LocalesResponse, LocalizedResponse, TypesResponse, BulkLocalizedResponse } from '../api/response/Localization';
import { Asset, Locale, LocalizedFilter } from '../api/model/Localization';
import Request from '../api/Request';

export function LocalizationControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/localization')
  class LocalizationController extends BaseHttpController {
    constructor(
      @inject('LocalizationService') private localizationService: LocalizationService,
    ) {
      super();
    }

    @httpGet('/assets', auth)
    private async getAssets(@queryParam('name') name?: string,
                            @queryParam('type') type?: string,
                            @queryParam('locale') locale?: string,
                            @queryParam('released') released?: string,
                            @queryParam('offset') offset?: string,
                            @queryParam('limit') limit?: string,
                            @queryParam('search') search?: string): Promise<AssetsResponse> {
      return this.localizationService.getAssets({name, type, locale, released, offset, limit, search});
    }

    @httpPost('/assets', auth)
    private async createAsset(@requestBody() asset: Asset): Promise<void> {
      return this.localizationService.createAsset(asset);
    }

    @httpGet('/assets/:id', auth)
    private async getAssetById(@requestParam('id') id: string): Promise<Asset> {
      return this.localizationService.getAssetById(id);
    }

    @httpPost('/assets/:id', auth)
    private async updateAsset(@requestParam('id') id: string, @requestBody() asset: Asset): Promise<void> {
      return this.localizationService.updateAsset(id, asset);
    }

    @httpDelete('/assets/:id', auth)
    private async deleteAsset(@requestParam('id') id: string): Promise<void> {
      return this.localizationService.deleteAsset(id);
    }

    @httpGet('/locales', auth)
    private async getLocales( @queryParam('fallback') fallback?: string,
                              @queryParam('released') released?: string,
                              @queryParam('offset') offset?: string,
                              @queryParam('limit') limit?: string): Promise<LocalesResponse> {
      return this.localizationService.getLocales({fallback, released, offset, limit});
    }

    @httpPost('/locales', auth)
    private async createLocale(@requestBody() locale: Locale): Promise<void> {
      return this.localizationService.createLocale(locale);
    }

    @httpGet('/locales/:id', auth)
    private async getLocaleById(@requestParam('id') id: string): Promise<Locale> {
      return this.localizationService.getLocaleById(id);
    }

    @httpPost('/locales/:id', auth)
    private async updateLocale(@requestParam('id') id: string, @requestBody() locale: Locale): Promise<void> {
      return this.localizationService.updateLocale(id, locale);
    }

    @httpDelete('/locales/:id', auth)
    private async deleteLocale(@requestParam('id') id: string): Promise<void> {
      return this.localizationService.deleteLocale(id);
    }

    @httpGet('/localized', auth)
    private async getLocalizedValue(@request() req: Request,
                                    @queryParam('name') name?: string,
                                    @queryParam('type') type?: string,
                                    @queryParam('locale') locale?: string,
                                    @queryParam('caching') caching?: string): Promise<LocalizedResponse> {

      const { query } = req;
      const args = _.chain(query).pickBy((value, key) => key.startsWith('args.')).mapKeys((value, key) => key.split('.')[1]).value();

      // tslint:disable no-object-literal-type-assertion
      return this.localizationService.getLocalizedValue({name, type, locale, args} as LocalizedFilter, caching);
    }

    @httpPost('/localized', auth)
    private async getLocalizedValues( @requestBody() filter: { items: LocalizedFilter[] },
                                      @queryParam('caching') caching: string): Promise<BulkLocalizedResponse> {
      return this.localizationService.getLocalizedValues(filter, caching);
    }

    @httpGet('/types', auth)
    private async getTypes( @queryParam('caching') caching: string,
                            @queryParam('offset') offset?: string,
                            @queryParam('limit') limit?: string): Promise<TypesResponse> {
      return this.localizationService.getTypes({caching, offset, limit});
    }
  }

  return LocalizationControllerFactory;
}