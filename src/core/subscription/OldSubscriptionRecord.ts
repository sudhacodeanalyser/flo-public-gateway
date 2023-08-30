import { Subscription } from '../api';
import * as _ from 'lodash';

export interface OldSubscriptionRecordData {
  account_id: string;
  status: string;
  location_id: string;
  stripe_customer_id: string;
  plan_id: string;
  source_id?: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at?: string;
  ended_at?: string;
  cancel_at_period_end?: boolean;
  cancellation_reason?: string;
  stripe_subscription_id: string;
  created_at?: string;
  updated_at?: string;
}

export class OldSubscriptionRecord {
  public static toModel(record: OldSubscriptionRecordData): Subscription {
     return {
      id: record.account_id,
      plan: {
        id: record.plan_id
      },
      location: {
        id: record.location_id
      },
      sourceId: record.source_id || 'unknown',
      provider: {
        name: 'stripe',
        isActive: record.status === 'trialing' || record.status === 'active',
        data: {
          customerId: record.stripe_customer_id,
          subscriptionId: record.stripe_subscription_id,
          status: record.status,
          currentPeriodStart: record.current_period_start,
          currentPeriodEnd: record.current_period_end,
          cancelAtPeriodEnd: record.cancel_at_period_end
        }
      },
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      cancellationReason: record.cancellation_reason
    };
  }

  public static isOldSubscriptionRecord(data: unknown): data is OldSubscriptionRecordData {
    return _.isObject(data) && !(data as any).related_entity;
  }
}