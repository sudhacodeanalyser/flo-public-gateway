import Request from '../api/Request';

export interface HealthTest {
  roundId: string;
  deviceId: string;
  status: string;
  type: string;
  leakType: number;
  leakLossMinGal: number;
  leakLossMaxGal: number;
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
  run(deviceMacAddress: string, icdId: string): Promise<HealthTest>;

  getLatest(deviceMacAddress: string): Promise<HealthTest | null>;

  getTestResultByRoundId(roundId: string): Promise<HealthTest | null>;
}

export interface HealthTestServiceFactory {
  create(req: Request): HealthTestService;
}