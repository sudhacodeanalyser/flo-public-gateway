import accountContainerModule from './account/containerModule';
import apiContainerModule from './api/containerModule';
import deviceContainerModule from './device/containerModule';
import locationContainerModule from './location/containerModule';
import lookupContainerModule from './lookup/containerModule';
import pingContainerModule from './ping/containerModule';
import presenceContainerModule from './presence/containerModule';
import subscriptionContainerModule from './subscription/containerModule';
import userContainerModule from './user/containerModule';
import notificationContainerModule from './notification/containerModule';
import waterContainerModule from './water/containerModule';
import sensorsContainerModule from './sensors/containerModule';
import sessionContainerModule from './session/containerModule';
import alarmContainerModule from './alarm/containerModule';
import alertContainerModule from './alert/containerModule';
import floDetectContainerModule from './flo-detect/containerModule';
import entityActivityContainerModule from './entity-activity/containerModule';
import resourceEventContainerModule from './resource-event/containerModule';
import telemetryContainerModule from './telemetry/containerModule';
import iftttContainerModule from './ifttt/containerModule';
import deliveryHookContainerModule from './delivery-hook/containerModule';
import headsUpContainerModule from './heads-up/containerModule';
import eventContainerModule from './event/containerModule';
import alexaContainerModule from './alexa/containerModule';
import alarmDotcomModule from './alarm-dotcom/containerModule';

export default [
  pingContainerModule,
  accountContainerModule,
  deviceContainerModule,
  apiContainerModule,
  locationContainerModule,
  userContainerModule,
  subscriptionContainerModule,
  presenceContainerModule,
  lookupContainerModule,
  notificationContainerModule,
  waterContainerModule,
  sensorsContainerModule,
  sessionContainerModule,
  alarmContainerModule,
  alertContainerModule,
  floDetectContainerModule,
  entityActivityContainerModule,
  resourceEventContainerModule,
  telemetryContainerModule,
  iftttContainerModule,
  deliveryHookContainerModule,
  headsUpContainerModule,
  eventContainerModule,
  alexaContainerModule,
  alarmDotcomModule
];
