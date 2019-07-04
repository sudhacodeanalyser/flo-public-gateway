
export interface HealthTestService {
  run(deviceMacAddress: string): Promise<void>;

  getLatest(deviceMacAddress: string): Promise<void>;
}