// All controllers must be imported here
import { Container } from 'inversify';
import { interfaces } from 'inversify-express-utils';
import { PingControllerFactory } from './ping/PingControllerFactory';
import { DeviceControllerFactory } from './device/DeviceControllerFactory';
import { AccountControllerFactory } from './account/AccountControllerFactory';
import { LocationControllerFactory } from './location/LocationControllerFactory';
import { UserControllerFactory } from './user/UserControllerFactory';
import { SubscriptionControllerFactory } from './subscription/SubscriptionControllerFactory';

export default function ControllerFactory(container: Container): interfaces.Controller[] {
  return [
    PingControllerFactory,
    AccountControllerFactory,
    DeviceControllerFactory,
    LocationControllerFactory,
    UserControllerFactory,
    SubscriptionControllerFactory
  ]
  .map(controllerFactory => controllerFactory(container));
}

