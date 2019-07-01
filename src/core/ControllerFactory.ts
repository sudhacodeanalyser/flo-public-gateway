// All controllers must be imported here
import { Container } from 'inversify';
import { interfaces } from 'inversify-express-utils';
import { AccountControllerFactory } from './account/AccountControllerFactory';
import { DeviceControllerFactory } from './device/DeviceControllerFactory';
import { LocationControllerFactory } from './location/LocationControllerFactory';
import { LookupControllerFactory } from './lookup/LookupControllerFactory';
import { LocalizationControllerFactory } from './localization/LocalizationControllerFactory';
import { NotificationControllerFactory } from './notification/NotificationControllerFactory';
import { PingControllerFactory } from './ping/PingControllerFactory';
import { PresenceControllerFactory } from './presence/PresenceControllerFactory';
import { SubscriptionControllerFactory } from './subscription/SubscriptionControllerFactory';
import { UserControllerFactory } from './user/UserControllerFactory';

export default function ControllerFactory(container: Container, apiVersion: number = 2): interfaces.Controller[] {
  return [
    PingControllerFactory,
    AccountControllerFactory,
    DeviceControllerFactory,
    LocationControllerFactory,
    UserControllerFactory,
    SubscriptionControllerFactory,
    PresenceControllerFactory,
    LookupControllerFactory,
    LocalizationControllerFactory,
    NotificationControllerFactory,
  ]
  .map(controllerFactory => controllerFactory(container, apiVersion));
}

