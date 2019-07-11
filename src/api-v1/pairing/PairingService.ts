import { inject, injectable } from 'inversify';
import { HttpService } from '../../http/HttpService';
import { QrData, PairingData, CompletePairingData, PairingDataCodec, QrDataValidator } from './models';
import { isLeft } from 'fp-ts/lib/Either';

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
}

export { PairingService, QrData, PairingData, CompletePairingData, QrDataValidator };