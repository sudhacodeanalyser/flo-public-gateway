import { Container } from 'inversify';
import config from '../config/config';

// Shared container modules
import loggerFactoryContainerModule from '../logging/containerModule';
import validationContainerModule from '../validation/containerModule';
import dynamoDbContainerModule from '../database/dynamo/containerModule';
import authContainerModule from '../auth/containerModule';
import subscriptionProviderModule from '../subscription/containerModule';
import kafkaContainerModule from '../kafka/containerModule';
import internalDeviceServiceFetcherModule from '../internal-device-service/containerModule';
import apiV1ContainerModule from '../api-v1/containerModule';
import postgresContainerModule from '../database/pg/containerModule';
import localizationContainerModule from '../localization/containerModule';
import influxContainerModule from '../database/influx/containerModule';

// Core container modules
import coreContainerModules from '../core/containerModule';

export default function ContainerFactory(container: Container = new Container()): Container {

  container.bind<typeof config>('Config').toConstantValue(config);

  container.load(
    loggerFactoryContainerModule,
    validationContainerModule,
    dynamoDbContainerModule,
    authContainerModule,
    subscriptionProviderModule,
    kafkaContainerModule,
    internalDeviceServiceFetcherModule,
    apiV1ContainerModule,
    localizationContainerModule,
    postgresContainerModule,
    influxContainerModule,
    ...coreContainerModules
  );

  return container;
}