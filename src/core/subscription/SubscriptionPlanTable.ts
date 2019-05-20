import { inject, injectable } from 'inversify';
import DatabaseClient from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { SubscriptionPlanRecordData } from './SubscriptionPlanRecord';

@injectable()
class SubscriptionPlanTable extends DatabaseTable<SubscriptionPlanRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'SubscriptionPlan');
  }
}

export default SubscriptionPlanTable;