import { PresenceData, PresenceRequest } from '../api/model/Presence';

export interface ExternalPresenceService {
  getNow(): Promise<any>;
  getHistory(): Promise<any>;
  getByUserId(userId: string): Promise<any>;
  report(payload: PresenceRequest): Promise<PresenceData>
}