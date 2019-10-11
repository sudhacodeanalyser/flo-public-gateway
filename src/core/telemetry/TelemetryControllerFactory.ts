import { Container, inject } from 'inversify';
import { httpPost, interfaces, requestBody } from 'inversify-express-utils';
import * as t from 'io-ts';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { DeviceTelemetryCodec, PuckTelemetryCodec, Telemetry } from '../api';
import { asyncMethod, httpController } from '../api/controllerUtils';
import { TelemetryService } from '../service';

export function TelemetryControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');

  @httpController({ version: apiVersion }, '/telemetry')
  class TelemetryController implements interfaces.Controller {
    constructor(
      @inject('TelemetryService') private readonly telemetryService: TelemetryService
    ) {}

    @httpPost('/',
      // TODO: PUCK. Implement proper auth.
      reqValidator.create(t.type({
        body: t.union([
          DeviceTelemetryCodec,
          PuckTelemetryCodec
        ])
      }))
    )
    @asyncMethod
    private async publishTelemetry(@requestBody() telemetry: Telemetry): Promise<void> {
      return this.telemetryService.publishTelemetry(telemetry);
    }
  }
  return TelemetryController;
}