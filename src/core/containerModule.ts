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
import sessionContainerModule from './session/containerModule';
import alarmContainerModule from './alarm/containerModule';
import alertContainerModule from './alert/containerModule';
import floDetectContainerModule from './flo-detect/containerModule';
import entityActivityContainerModule from './entity-activity/containerModule';
import telemetryContainerModule from './telemetry/containerModule';
import iftttContainerModule from './ifttt/containerModule';
import deliveryHookContainerModule from './delivery-hook/containerModule';

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
  sessionContainerModule,
  alarmContainerModule,
  alertContainerModule,
  floDetectContainerModule,
  entityActivityContainerModule,
  telemetryContainerModule,
  iftttContainerModule,
  deliveryHookContainerModule
];
