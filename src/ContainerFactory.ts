import { Container, ContainerModule } from 'inversify';
import config from './config';

// Shared container modules
import sharedContainerModules from './container-modules';

// Service container modules
import serviceContainerModules from './services/';

export default function ContainerFactory(container = new Container()) {
  
  container.bind<typeof config>('Config').toConstantValue(config);

  container.load(
    ...sharedContainerModules,
    ...serviceContainerModules
  );

  return container;
}