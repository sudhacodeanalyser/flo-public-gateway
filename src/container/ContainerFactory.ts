import { Container } from 'inversify';
import config from '../config/config';

// Shared container modules
import loggerFactoryContainerModule from '../logging/containerModule';
import validationContainerModule from '../validation/containerModule';
import dynamoDbContainerModule from '../database/dynamo/containerModule';

// Core container modules
import coreContainerModules from '../core/containerModule';

export default function ContainerFactory(container: Container = new Container()): Container {

  container.bind<typeof config>('Config').toConstantValue(config);

  container.load(
    loggerFactoryContainerModule,
    validationContainerModule,
    dynamoDbContainerModule,
    ...coreContainerModules
  );

  return container;
}