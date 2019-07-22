export interface WaterConsumptionItem {
  time: string;
  gallonsConsumed: number;
};

export interface WaterConsumptionReport {
  params: {
    startDate: string;
    endDate: string;
    interval: string;
    tz: string;
    locationId?: string;
    macAddress?: string;
  },
  aggregations?: {
    sumTotalGallonsConsumed?: number
  };
  items: WaterConsumptionItem[]
}

export enum WaterConsumptionInterval {
  ONE_HOUR = '1h',
  ONE_DAY = '1d'
}