import { Container, inject } from 'inversify';
import { httpGet, httpPost, httpPut, interfaces, request, requestBody } from 'inversify-express-utils';
import * as t from 'io-ts';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import ReqValidationMiddlewareFactory from '../../validation/ReqValidationMiddlewareFactory';
import { DeviceTelemetryCodec, PuckTelemetryCodec, Tag, TagCreate, TagDetail, Tags, Telemetry } from '../api';
import { asyncMethod, httpController } from '../api/controllerUtils';
import Request from '../api/Request';
import { TelemetryService } from '../service';
import { TelemetryTagsService } from './TelemetryTagsService';

export function TelemetryControllerFactory(container: Container, apiVersion: number): interfaces.Controller {
  const reqValidator = container.get<ReqValidationMiddlewareFactory>('ReqValidationMiddlewareFactory');
  const authMiddlewareFactory = container.get<AuthMiddlewareFactory>('AuthMiddlewareFactory');
  const auth = authMiddlewareFactory.create();

  @httpController({ version: apiVersion }, '/telemetry')
  class TelemetryController implements interfaces.Controller {
    constructor(
      @inject('TelemetryService') private readonly telemetryService: TelemetryService,
      @inject('TelemetryTagsService') private readonly telemetryTagsService: TelemetryTagsService
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

    @httpGet('/tags', auth)
    private async retrieveTags(@request() req: Request): Promise<Tags> {
      return this.telemetryTagsService.retrieveTags(req.query);
    }

    @httpPut('/tags', auth)
    private async createTag(@requestBody() tagCreate: TagCreate): Promise<Tag> {
      return this.telemetryTagsService.createTag(tagCreate);
    }

    @httpPost('/tags/open', auth)
    private async openTag(@requestBody() tagDetail: TagDetail): Promise<Tag> {
      return this.telemetryTagsService.openTag(tagDetail);
    }

    @httpPost('/tags/close', auth)
    private async closeTag(@requestBody() tagDetail: TagDetail): Promise<Tag> {
      return this.telemetryTagsService.closeTag(tagDetail);
    }
  }
  return TelemetryController;
}