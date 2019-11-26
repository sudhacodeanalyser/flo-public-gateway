import { PairingData } from '../../api-v1/pairing/PairingService';

export interface PairingResponse extends PairingData {
  firestore: {
    token: string
  };
}

// TODO: PUCK. Revisit this.
export interface PuckPairingResponse {
  id: string;
  token: string;
}