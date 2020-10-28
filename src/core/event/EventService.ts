import { inject, injectable } from 'inversify';
import EventTable from './EventTable';
import { Event, DeviceMake, RawEvent, getEventRefIdPropertyName } from '../api';
import moment from 'moment';
import Logger from 'bunyan';


@injectable()
class EventService {

  constructor(
    @inject('EventTable') private readonly eventTable: EventTable,
    @inject('Logger') private readonly logger: Logger,
  ) {}

  public async createEvent(rawEvent: RawEvent, make: DeviceMake, timestamp?: string): Promise<void> {
    let createdAt;
    const value = timestamp ? parseInt(timestamp, 10) : undefined;
    if (value === undefined || isNaN(value)) {
      createdAt = moment().toISOString();
      this.logger.warn(`Date parameter is undefined or invalid. Using now instead: ${createdAt}`, rawEvent);
    } else {
      createdAt = moment.unix(value).toISOString();
    }

    const refIdPropertyName = getEventRefIdPropertyName(make);
    const refId = refIdPropertyName ? rawEvent[refIdPropertyName] : undefined;
    const ev: Event = {
      refId: refId || 'unset',
      eventType: rawEvent.type,
      deviceModel: rawEvent.model,
      deviceMake: make,
      data: JSON.stringify(rawEvent),
      createdAt
    }

    return this.eventTable.createEvent(ev);
  }
}

export { EventService };