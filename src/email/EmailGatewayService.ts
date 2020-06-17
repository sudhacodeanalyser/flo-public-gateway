import { injectable, inject } from 'inversify';
import { HttpService, HttpError } from '../http/HttpService'

@injectable()
class EmailGatewayService extends HttpService {
  constructor(
    @inject('EmailGatewayUrl') public readonly url: string
  ) {
    super();
  }

  public async queue(emailAddress: string, templateId: string, data: Record<string, any>): Promise<void> {
    const request = {
      method: 'POST',
      url: `${ this.url }/queue`,
      data: {
        client_app_name: 'Public Gateway',
        time_stamp: new Date().toISOString(),
        recipients: [{
          email_address: emailAddress,
          data: {
            template_id: templateId,
            email_template_data: data
          }
        }]
      }
    };

    await this.sendRequest(request);
  }
}

export { EmailGatewayService };