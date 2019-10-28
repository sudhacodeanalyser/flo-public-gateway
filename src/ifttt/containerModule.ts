import { ContainerModule, interfaces } from 'inversify';
import config from '../config/config';
import { DefaultIFTTTTestService } from './DefaultIFTTTTestService';
import { IFTTTServiceFactory } from '../core/service';
import { DefaultIFTTTService } from './DefaultIFTTTService';
import { DirectiveServiceFactory } from '../core/device/DirectiveService';
import { ApiV1DirectiveServiceFactory } from '../api-v1/directive/ApiV1DirectiveServiceFactory';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('ApiV1IFTTTTestSetupUrl').toConstantValue(config.apiV1IFTTTTestSetupUrl);
  bind<DefaultIFTTTTestService>('DefaultIFTTTTestService').to(DefaultIFTTTTestService);
  bind<DefaultIFTTTService>('DefaultIFTTTService').to(DefaultIFTTTService);
  bind<DirectiveServiceFactory>('DirectiveServiceFactory').to(ApiV1DirectiveServiceFactory);
  bind<IFTTTServiceFactory>('IFTTTServiceFactory').toFactory((context: interfaces.Context) => 
    (isTest: boolean) => isTest ? 
      context.container.get<DefaultIFTTTTestService>('DefaultIFTTTTestService')
      :
      context.container.get<DefaultIFTTTService>('DefaultIFTTTService')
  );
});
