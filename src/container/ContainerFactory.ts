import { Container } from 'inversify';
import apiV1ContainerModule from '../api-v1/containerModule';
import authContainerModule from '../auth/containerModule';
import cacheContainerModule from '../cache/containerModule';
import config from '../config/config';
import httpContainerModule from '../http/containerModule';
import emailContainerModule from '../email/containerModule';
import concurrencyContainerModule from '../concurrency/containerModule';
// Core container modules
import coreContainerModules from '../core/containerModule';
import dynamoDbContainerModule from '../database/dynamo/containerModule';
import influxContainerModule from '../database/influx/containerModule';
import postgresContainerModule from '../database/pg/containerModule';
import redisContainerModule from '../database/redis/containerModule';
import healthTestServiceContainerModule from '../health-test/containerModule';
import internalDeviceServiceFetcherModule from '../internal-device-service/containerModule';
import kafkaContainerModule from '../kafka/containerModule';
import localizationContainerModule from '../localization/containerModule';
import iftttContainerModule from '../ifttt/containerModule';
// Shared container modules
import loggerFactoryContainerModule from '../logging/containerModule';
import memoizeContainerModule from '../memoize/containerModule';
import presenceContainerModule from '../presence/containerModule';
import subscriptionProviderModule from '../subscription/containerModule';
import validationContainerModule from '../validation/containerModule';
import telemetryTagsContainerModule from '../telemetry/containerModule';
import machineLearningContainerModule from '../machine-learning/containerModule';
import irrigationContainerModule from '../irrigation/containerModule';
import googlePlacesContainerModule from '../google-places/containerModule';
import enterpriseServiceContainerModule from '../enterprise-service/containerModule';

export default function ContainerFactory(container: Container = new Container()): Container {

  container.bind<typeof config>('Config').toConstantValue(config);
  container.bind<Container>('Container').toConstantValue(container);

  container.load(
    httpContainerModule,
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
    influxContainerModule,
    memoizeContainerModule,
    redisContainerModule,
    cacheContainerModule,
    presenceContainerModule,
    telemetryTagsContainerModule,
    iftttContainerModule,
    machineLearningContainerModule,
    emailContainerModule,
    irrigationContainerModule,
    googlePlacesContainerModule,
    concurrencyContainerModule,
    enterpriseServiceContainerModule,
    ...coreContainerModules
  );

  return container;
}
