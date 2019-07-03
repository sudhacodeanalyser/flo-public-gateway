import { HealthTestService } from '../core/device/HealthTestService';

export class DefaulthHealthTestService implements HealthTestService {
  public async run(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async cancel(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}