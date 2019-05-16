import { SubscriptionPlan, Timestamped } from '../api';

export interface SubscriptionPlanRecordData extends Timestamped {
  plan_id: string
  features: string[]
  monthly_cost: number
}

export class SubscriptionPlanRecord {
  constructor(
    public data: SubscriptionPlanRecordData
  ) {}

  public toModel(): SubscriptionPlan {
    return {
      id: this.data.plan_id,
      features: this.data.features,
      monthlyCost: this.data.monthly_cost,
      createdAt: this.data.created_at,
      updatedAt: this.data.updated_at
    }
  }
}
