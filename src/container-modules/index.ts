import loggerFactoryContainerModule from './loggerFactory';
import dynamoDBContainerModule from './dynamoDB';
import middlewareContainerModule from './middleware';

export default [
  loggerFactoryContainerModule,
  dynamoDBContainerModule,
  middlewareContainerModule
];