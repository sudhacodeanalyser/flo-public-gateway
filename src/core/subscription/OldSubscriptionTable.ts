import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { SubscriptionRecordData } from './SubscriptionRecord';

// TODO: Remove me once data migration is completed.
@injectable()
class OldSubscriptionTable extends DatabaseTable<SubscriptionRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'AccountSubscription');
  }
}

export default OldSubscriptionTable;