import { inject, injectable } from 'inversify';
import { HttpService, HttpError } from '../../http/HttpService';
import { QrData, PairingData, CompletePairingData, PairingDataCodec, QrDataValidator } from './models';
import { isLeft } from 'fp-ts/lib/Either';
import * as Option from 'fp-ts/lib/Option';
import _ from 'lodash';

@injectable()
class PairingService extends HttpService {
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

    if (isLeft(PairingDataCodec.decode(response))) {

       throw new Error('Invalid response.');
    }

    return response as PairingData;
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

  public async retrievePairingData(authToken: string, id: string): Promise<Option.Option<PairingData>> {
    try {
      const request = {
        method: 'GET',
        url: `${ this.apiV1Url }/pairing/qr/icd/${ id }`,
        authToken
      };
      const response = await this.sendRequest(request);

      if (_.isEmpty(response)) {
        return Option.none;
      } else if (isLeft(PairingDataCodec.decode(response))) {
        throw new Error('Invalid response.');
      } else {
        return Option.some(response);
      }
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