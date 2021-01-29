import { ContainerModule, interfaces } from 'inversify';
import TwilioAuthMiddlewareFactory from "./TwilioAuthMiddlewareFactory";
import config from "../../config/config";

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<string>('TwilioAuthToken').toConstantValue(config.twilioAuthToken);
  bind<string>('PublicGatewayHost').toConstantValue(config.publicGatewayHost);
  bind<string>('CallbackGatewayHost').toConstantValue(config.callbackGatewayHost);
  bind<TwilioAuthMiddlewareFactory>('TwilioAuthMiddlewareFactory').to(TwilioAuthMiddlewareFactory);
});
