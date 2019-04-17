import { Timestamped } from '../api/api';

export interface UserRecord extends Timestamped {
  id: string,
  email: string,
  email_hash: string,
  password: string,
  source?: string,
  is_active?: boolean
}