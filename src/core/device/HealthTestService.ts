export interface HealthTest {
  roundId: string;
  deviceId: string;
  status: string;
  source: string;
  leakType: number;
  startPressure: number;
  endPressure: number;
  startRawPayload: any;
  endRawPayload: any;
  created: string;
  updated: string;
  startDate: string;
  endDate: string;
}


export interface HealthTestService {
  run(deviceMacAddress: string): Promise<void>;

  getLatest(deviceMacAddress: string): Promise<HealthTest | null>;
}