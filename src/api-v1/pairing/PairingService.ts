import { inject, injectable } from 'inversify';
import { HttpService, HttpError } from '../../http/HttpService';
import { QrData, PairingData, CompletePairingData, PairingDataFromResponse, QrDataValidator } from './models';
import * as Either from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import * as _ from 'lodash';
import { CacheMixin, cached, cacheKey } from '../../cache/CacheMixin';

@injectable()
class PairingService extends CacheMixin(HttpService) {
  constructor(
    @inject('ApiV1Url') private readonly apiV1Url: string
  ) {
    super();
  }

  public async initPairing(authToken: string, qrData: QrData): Promise<PairingData> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/pairing/init`,
      body: qrData,
      authToken
    };
    const response = await this.sendRequest(request);

    return pipe(
      PairingDataFromResponse.decode(response),
      Either.fold(
        async () => Promise.reject(new Error('Invalid response.')),
        async data => data
      )
    );
  }

  public async completePairing(authToken: string, pairingId: string, data: CompletePairingData): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.apiV1Url }/pairing/complete/${ pairingId }`,
      body: {
        device_id: data.macAddress,
        timezone: data.timezone
      },
      authToken
    };

    await this.sendRequest(request);
  }

  @cached('PairingData')
  public async retrievePairingData(authToken: string, @cacheKey() id: string): Promise<Option.Option<PairingData>> {
    try {
      const request = {
        method: 'GET',
        url: `${ this.apiV1Url }/pairing/qr/icd/${ id }`,
        authToken
      };
      const response = await this.sendRequest(request);

      if (_.isEmpty(response)) {
        return Option.none;
      } 

      return pipe(
        PairingDataFromResponse.decode(response),
        Either.fold(
          async () => Promise.reject(new Error('Invalid response.')),
          async data => Option.some(data)
        )
      );
    } catch (err) {
      if (err instanceof HttpError && err.statusCode === 404) {
        return Option.none;
      } else {
        throw err;
      }
    }
  }
}

export { PairingService, QrData, PairingData, CompletePairingData, QrDataValidator };