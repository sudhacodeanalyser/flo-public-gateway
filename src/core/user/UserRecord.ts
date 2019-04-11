export default interface UserRecord {
  id: string,
  email: string,
  password: string,
  is_active?: boolean,
  created_at?: string,
  updated_at?: string
}