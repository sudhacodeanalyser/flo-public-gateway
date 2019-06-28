import pingContainerModule from './ping/containerModule';
import accountContainerModule from './account/containerModule';
import deviceContainerModule from './device/containerModule';
import apiContainerModule from './api/containerModule';
import locationContainerModule from './location/containerModule';
import userContainerModule from './user/containerModule';
import subscriptionContainerModule from './subscription/containerModule';
import presenceContainerModule from './presence/containerModule';
import lookupContainerModule from './lookup/containerModule';
import notificationContainerModule from './notification/containerModule';

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
  notificationContainerModule
];