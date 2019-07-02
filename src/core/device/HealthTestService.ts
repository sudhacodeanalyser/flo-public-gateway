
export interface HealthTestService {
  run(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
}