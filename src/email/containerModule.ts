import { ContainerModule, interfaces } from 'inversify';
import { SendWithUsEmailClient } from './SendWithUsEmailClient';
import sendwithus, { SendWithUsApi } from 'sendwithus';
import EmailClient from './EmailClient';
import config from '../config/config';
import { EmailGatewayService } from './EmailGatewayService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<SendWithUsApi>('SendWithUsApi').toConstantValue(sendwithus(config.sendWithUsKey));
  bind<EmailClient>('EmailClient').to(SendWithUsEmailClient);
  bind<EmailGatewayService>('EmailGatewayService').to(EmailGatewayService);
  bind<string>('EmailGatewayUrl').toConstantValue(config.emailGatewayUrl);
});