import { Container, ContainerModule } from 'inversify';
import config from '../config/config';

// Shared container modules
import loggerFactoryContainerModule from '../logging/containerModule';
import dynamoDbContainerModule from '../database/dynamo/containerModule';

// Core container modules
import coreContainerModules from '../core/containerModule';

export default function ContainerFactory(container = new Container()) {

  container.bind<typeof config>('Config').toConstantValue(config);

  container.load(
    loggerFactoryContainerModule,
    dynamoDbContainerModule,
    ...coreContainerModules
  );

  return container;
}