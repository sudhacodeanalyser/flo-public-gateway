export enum SensorInterval {
  ONE_HOUR = '1h',
  ONE_DAY = '1d',
  ONE_MONTH = '1m'
}

export interface SensorItem {
  time: string;
  averageBattery?: number;
  averageHumidity?: number;
  averageTempF?: number;
}

export interface SensorMetricsReport {
  params: {
    startDate?: string;
    endDate?: string;
    interval: string;
    tz: string;
    macAddress: string;
  };
  items: SensorItem[];
}