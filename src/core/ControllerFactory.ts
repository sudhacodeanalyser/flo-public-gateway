// All controllers must be imported here
import { Container } from 'inversify';
import { PingControllerFactory } from './ping/PingControllerFactory';
import { DeviceControllerFactory } from './device/DeviceControllerFactory';
import { AccountControllerFactory } from './account/AccountControllerFactory';
import { LocationControllerFactory } from './location/LocationControllerFactory';

export default function ControllerFactory(container: Container) {
  return [
    PingControllerFactory,
    AccountControllerFactory,
    DeviceControllerFactory,
    LocationControllerFactory
  ]
  .map(controllerFactory => controllerFactory(container));
}

