// All controllers must be imported here
// import './ping/PingController';
// import './account/AccountController';
import { Container } from 'inversify';
import { DeviceControllerFactory } from './device/DeviceControllerFactory';

export default function ControllerFactory(container: Container) {
  return [
    DeviceControllerFactory
  ]
  .map(controllerFactory => controllerFactory(container));
}

