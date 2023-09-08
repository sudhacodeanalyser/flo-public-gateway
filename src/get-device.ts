// @ts-nocheck
/* tslint:disable */
import 'reflect-metadata';
import { mockReq, mockRes } from 'sinon-express-mock'
import { interfaces } from "inversify-express-utils"
import { DeviceService } from "./core/device/DeviceService";
import ContainerFactory from "./container/ContainerFactory";
import Config from "./config/config";
import { Loaders } from './memoize/MemoizeMixin';
import { CachePolicy } from './cache/CacheMiddleware';
import LoggerFactory from './logging/LoggerFactory';
import Logger from 'bunyan';
import * as AWS from 'aws-sdk';
import { Option } from 'fp-ts/lib/Option';
import { Device } from './core/api';

const container = ContainerFactory();

const mockRequest = mockReq()
const mockResponse = mockRes()
const mockUser: interfaces.Principal = {
    details: "",
    isAuthenticated: () => Promise.resolve(true),
    isResourceOwner: () => Promise.resolve(true),
    isInRole: () => Promise.resolve(true)
};
const mockedHttpContext: interfaces.HttpContext = {
    request: mockRequest,
    response: mockResponse,
    user: mockUser,
    container
};

(async () => {
  console.log(`Bind implementations not found in ContainerFactory`);
  container.bind<Loaders>('Loaders').toConstantValue(new Map());
  container.bind<CachePolicy>('CachePolicy').toConstantValue(CachePolicy.READ_WRITE);
  container.bind<interfaces.HttpContext>(Symbol.for("HttpContext")).toConstantValue(mockedHttpContext);
  
  console.log(`Create Logger`);
  const loggerFactory = container.get<LoggerFactory>('LoggerFactory');
  const logger = loggerFactory.createLogger();
  container.bind<Logger>('Logger').toConstantValue(logger);
  
  console.log(`Load Config`);
  const config = container.get<typeof Config>('Config');
  // console.log(`Config: ${JSON.stringify(config, null, 2)}`);
  console.log(`Load device service`);
  const deviceService = container.get<DeviceService>('DeviceService');
  // console.log(`deviceService: ${JSON.stringify(deviceService)}`);
//
  // OPTION 1
  // const ddbclient = new AWS.DynamoDB.DocumentClient();
  // return ddbclient.query({
  //   TableName:'prod_ICD', 
  //   IndexName: 'DeviceIdIndex', 
  //   KeyConditionExpression: '#device_id = :device_id', 
  //   ExpressionAttributeNames: { "#device_id": "device_id" }, 
  //   ExpressionAttributeValues: { ":device_id": 'd8a98b8fd9e4' } 
  // }).promise();

  // OPTION: 2
  // const dynamoDbDocClient = new AWS.DynamoDB.DocumentClient({
  //   region: process.env.AWS_REGION
  // });
  // const response = await dynamoDbDocClient.query({
  //   TableName: 'prod_ICD',
  //   ...{
  //     "IndexName": "DeviceIdIndex",
  //     "KeyConditionExpression": "#device_id = :device_id",
  //     "ExpressionAttributeNames": {
  //       "#device_id": "device_id"
  //     },
  //     "ExpressionAttributeValues": {
  //       ":device_id": "d8a98b8fd9e4"
  //     }
  //   }
  // }).promise();
  // return response;

  console.log(`getByMacAddress`);
  const device: Option<Device> = await deviceService.getByMacAddress('d8a98b8fd9e4', { $select: { location: { $select: { id: true } } } });
  console.log(`device: ${JSON.stringify(device)}`);
  return device;

})()
.then(data => {
  console.log('DONE', JSON.stringify(data, null, 2))
})
.catch(err => {
  console.log('ERROR', err.message, err.stack)
})
.finally(() => process.exit(0));
