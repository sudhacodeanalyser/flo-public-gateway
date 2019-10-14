import { Tag, TagCreate, TagDetail, TagFilter, Tags } from '../api';

export interface TelemetryTagsService {
  retrieveTags(filter: TagFilter): Promise<Tags>;
  createTag(tag: TagCreate): Promise<Tag>;
  openTag(tagDetail: TagDetail): Promise<Tag>;
  closeTag(tagDetail: TagDetail): Promise<Tag>;
}