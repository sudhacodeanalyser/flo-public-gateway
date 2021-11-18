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
import { SensorControllerFactory } from './sensors/SensorControllerFactory';
import { SessionControllerFactory } from './session/SessionControllerFactory';
import { IncidentControllerFactory } from './incident/IncidentControllerFactory';
import { FloDetectControllerFactory } from './flo-detect/FloDetectControllerFactory';
import { AlertControllerFactory } from './alert/AlertControllerFactory';
import { TelemetryControllerFactory } from './telemetry/TelemetryControllerFactory';
import { IFTTTControllerFactory } from './ifttt/IFTTTControllerFactory';
import { DeliveryHookControllerFactory } from './delivery-hook/DeliveryHookControllerFactory';
import { HeadsUpControllerFactory } from './heads-up/HeadsUpControllerFactory';
import { EventControllerFactory } from './event/EventControllerFactory';
import { AccountSyncControllerFactory } from '../auth/moen/AccountSyncControllerFactory'
import { EmailControllerFactory } from './email/EmailControllerFactory';
import { ResourceEventControllerFactory } from './resource-event/ResourceEventControllerFactory';
import { AlexaControllerFactory } from './alexa/AlexaControllerFactory';
import { AlarmDotcomControllerFactory } from './alarm-dotcom/AlarmDotcomControllerFactory';

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
    SensorControllerFactory,
    SessionControllerFactory,
    AlarmControllerFactory,
    IncidentControllerFactory,
    FloDetectControllerFactory,
    AlertControllerFactory,
    TelemetryControllerFactory,
    IFTTTControllerFactory,
    DeliveryHookControllerFactory,
    HeadsUpControllerFactory,
    EventControllerFactory,
    AccountSyncControllerFactory,
    EmailControllerFactory,
    ResourceEventControllerFactory,
    AlexaControllerFactory,
    AlarmDotcomControllerFactory,
  ]
  .map(controllerFactory => controllerFactory(container, apiVersion));
}
