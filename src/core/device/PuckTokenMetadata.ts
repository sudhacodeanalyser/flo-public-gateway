export interface PuckTokenMetadata {
  id: string;
  puckId: string;
  createdAt: string;
  expiresAt?: string;
  clientId?: string;
  isInit?: boolean;
  locationId?: string;
  macAddress?: string;
  isRevoked?: boolean;
}