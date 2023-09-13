import * as _ from 'lodash';
import { inject, injectable, targetName } from 'inversify';
import squel from 'safe-squel';
import { PostgresDbClient } from '../../database/pg/PostgresDbClient';
import { PostgresTable } from '../../database/pg/PostgresTable';
import { EventRecordData } from './EventRecord';
import { Event } from '../api';

@injectable()
class EventTable extends PostgresTable<EventRecordData> {
  constructor(
    @inject('PostgresDbClient') @targetName('core') private pgDbClient: PostgresDbClient
  ) {
    super(pgDbClient, 'event');
  }

  public async createEvent(event: Event): Promise<void> {
    const { text, values } = squel.useFlavour('postgres')
      .insert()
      .into('event')
      .setFields({
        created_at: event.createdAt,
        ref_id: event.refId,
        event_type: event.eventType,
        device_make: event.deviceMake,
        device_model: event.deviceModel,
        data: event.data,
      })
      .onConflict('created_at, ref_id')
      .toParam();
    await this.pgDbClient.execute(text, values);
  }
}

export default EventTable;