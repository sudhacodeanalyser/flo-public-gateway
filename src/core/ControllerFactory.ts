// All controllers must be imported here
import { Container } from 'inversify';
import { PingControllerFactory } from './ping/PingControllerFactory';
import { DeviceControllerFactory } from './device/DeviceControllerFactory';
import { AccountControllerFactory } from './account/AccountControllerFactory';

export default function ControllerFactory(container: Container) {
  return [
    PingControllerFactory,
    AccountControllerFactory,
    DeviceControllerFactory
  ]
  .map(controllerFactory => controllerFactory(container));
}

