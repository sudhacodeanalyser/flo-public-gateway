import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { DefaultIFTTTTestService } from './DefaultIFTTTTestService';
import { IFTTTServiceFactory } from '../core/service';
import { DefaultIFTTTService } from './DefaultIFTTTService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ApiV1IFTTTTestSetupUrl').toConstantValue(config.apiV1IFTTTTestSetupUrl);
  bind<string>('IftttRealtimeNotificationsUrl').toConstantValue(config.iftttRealtimeNotificationsUrl);
  bind<DefaultIFTTTTestService>('DefaultIFTTTTestService').to(DefaultIFTTTTestService);
  bind<DefaultIFTTTService>('DefaultIFTTTService').to(DefaultIFTTTService);
  bind<IFTTTServiceFactory>('IFTTTServiceFactory').toFactory((context: interfaces.Context) => 
    (isTest: boolean) => isTest ? 
      context.container.get<DefaultIFTTTTestService>('DefaultIFTTTTestService')
      :
      context.container.get<DefaultIFTTTService>('DefaultIFTTTService')
  );
});
