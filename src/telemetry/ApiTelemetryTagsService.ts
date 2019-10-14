import { inject, injectable } from 'inversify';
import { Tag, TagCreate, TagDetail, TagFilter, Tags } from '../core/api';
import { TelemetryTagsService } from '../core/telemetry/TelemetryTagsService';
import { HttpService } from '../http/HttpService';

@injectable()
class ApiTelemetryTagsService extends HttpService implements TelemetryTagsService {

  constructor(
    @inject('TelemetryTagsServiceUrl') private readonly telemetryTagsServiceUrl: string
  ) {
    super();
  }

  public async retrieveTags(filter: TagFilter): Promise<Tags> {
    const request = {
      method: 'GET',
      url: `${ this.telemetryTagsServiceUrl }/tag`,
      params: {
        ...filter
      }
    };

    return this.sendRequest(request);
  }

  public async createTag(tag: TagCreate): Promise<Tag> {
    const request = {
      method: 'PUT',
      url: `${ this.telemetryTagsServiceUrl }/tag`,
      body: {
        ...tag
      }
    };

    return this.sendRequest(request);
  }

  public async openTag(tagDetail: TagDetail): Promise<Tag> {
    const request = {
      method: 'POST',
      url: `${ this.telemetryTagsServiceUrl }/tag/open`,
      body: {
        ...tagDetail
      }
    };

    return this.sendRequest(request);
  }

  public async closeTag(tagDetail: TagDetail): Promise<Tag> {
    const request = {
      method: 'POST',
      url: `${ this.telemetryTagsServiceUrl }/tag/close`,
      body: {
        ...tagDetail
      }
    };

    return this.sendRequest(request);
  }

}

export { ApiTelemetryTagsService };

