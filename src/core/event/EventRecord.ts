import { morphism, StrictSchema } from 'morphism';
import { Event } from '../api';

export interface EventRecordData {
  created_at: string;
  ref_id: string,
  event_type: string;
  device_make: string;
  device_model: string;
  data: string;
}

const RecordToModelSchema: StrictSchema<Event, EventRecordData> = {
  refId: 'ref_id',
  createdAt: 'created_at',
  eventType: 'event_type',
  deviceMake: 'device_make',
  deviceModel: 'device_model',
  data: 'data'
}

const ModelToRecordSchema: StrictSchema<EventRecordData, Event> = {
  ref_id: 'refId',
  created_at: 'createdAt',
  event_type: 'eventType',
  device_make: 'deviceMake',
  device_model: 'deviceModel',
  data: 'data'
}

export class EventRecord {
  public static fromModel(event: Event): EventRecordData {
    return morphism(ModelToRecordSchema, event) as EventRecordData;
  }

  constructor(
    public data: EventRecordData
  ) {}

  public toModel(): Event {
    return morphism(RecordToModelSchema, this.data);
  }
}
