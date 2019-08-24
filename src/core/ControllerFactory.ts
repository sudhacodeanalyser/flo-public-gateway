// All controllers must be imported here
import { Container } from 'inversify';
import { interfaces } from 'inversify-express-utils';
import { AccountControllerFactory } from './account/AccountControllerFactory';
import { DeviceControllerFactory } from './device/DeviceControllerFactory';
import { LocationControllerFactory } from './location/LocationControllerFactory';
import { LookupControllerFactory } from './lookup/LookupControllerFactory';
import { LocalizationControllerFactory } from './localization/LocalizationControllerFactory';
import { AlarmControllerFactory } from './alarm/AlarmControllerFactory';
import { PingControllerFactory } from './ping/PingControllerFactory';
import { PresenceControllerFactory } from './presence/PresenceControllerFactory';
import { SubscriptionControllerFactory } from './subscription/SubscriptionControllerFactory';
import { UserControllerFactory } from './user/UserControllerFactory';
import { WaterControllerFactory } from './water/WaterControllerFactory';
import { SessionControllerFactory } from './session/SessionControllerFactory';
import { EventControllerFactory } from './event/EventControllerFactory';
import { FloDetectControllerFactory } from './flo-detect/FloDetectControllerFactory';
import { AlertControllerFactory } from './alert/AlertControllerFactory';

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
    WaterControllerFactory,
    SessionControllerFactory,
    AlarmControllerFactory,
    EventControllerFactory,
    FloDetectControllerFactory,
    AlertControllerFactory
  ]
  .map(controllerFactory => controllerFactory(container, apiVersion));
}

