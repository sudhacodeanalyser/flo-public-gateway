export interface Timestamped {
  created_at?: string,
  updated_at?: string
}

export interface TimestampedModel {
  createdAt?: string,
  updatedAt?: string
}

export default Timestamped;