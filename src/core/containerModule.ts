import accountContainerModule from './account/containerModule';
import apiContainerModule from './api/containerModule';
import deviceContainerModule from './device/containerModule';
import locationContainerModule from './location/containerModule';
import lookupContainerModule from './lookup/containerModule';
import pingContainerModule from './ping/containerModule';
import presenceContainerModule from './presence/containerModule';
import subscriptionContainerModule from './subscription/containerModule';
import userContainerModule from './user/containerModule';

export default [
  pingContainerModule,
  accountContainerModule,
  deviceContainerModule,
  apiContainerModule,
  locationContainerModule,
  userContainerModule,
  subscriptionContainerModule,
  presenceContainerModule,
  lookupContainerModule
];