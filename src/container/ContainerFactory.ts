import { Container } from 'inversify';
import apiV1ContainerModule from '../api-v1/containerModule';
import authContainerModule from '../auth/containerModule';
import config from '../config/config';
// Core container modules
import coreContainerModules from '../core/containerModule';
import dynamoDbContainerModule from '../database/dynamo/containerModule';
import postgresContainerModule from '../database/pg/containerModule';
import healthTestServiceContainerModule from '../health-test/containerModule';
import internalDeviceServiceFetcherModule from '../internal-device-service/containerModule';
import kafkaContainerModule from '../kafka/containerModule';
import localizationContainerModule from '../localization/containerModule';
// Shared container modules
import loggerFactoryContainerModule from '../logging/containerModule';
import subscriptionProviderModule from '../subscription/containerModule';
import validationContainerModule from '../validation/containerModule';



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
    healthTestServiceContainerModule,
    ...coreContainerModules
  );

  return container;
}