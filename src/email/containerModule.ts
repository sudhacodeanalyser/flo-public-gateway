import { ContainerModule, interfaces } from 'inversify';
import { SendWithUsEmailClient } from './SendWithUsEmailClient';
import sendwithus, { SendWithUsApi } from 'sendwithus';
import EmailClient from './EmailClient';
import config from '../config/config';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<SendWithUsApi>('SendWithUsApi').toConstantValue(sendwithus(config.sendWithUsKey));
  bind<EmailClient>('EmailClient').to(SendWithUsEmailClient);
});