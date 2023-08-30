import { injectable, inject } from 'inversify';
import { SendWithUsApi } from 'sendwithus';
import EmailClient from './EmailClient';

@injectable()
class SendWithUsEmailClient implements EmailClient {
  constructor(
    @inject('SendWithUsApi') private client: SendWithUsApi
  ) {}

  public async send(email: string, templateId: string, data: Record<string, any>): Promise<void> {
    await new Promise((resolve, reject) => 
      this.client.send({
        template: templateId,
        recipient: {
          address: email
        },
        template_data: data
      }, err => {
        if (err) {
          reject(err);
        } else {
          resolve(undefined);
        }
      })
    );
  }
}

export { SendWithUsEmailClient };