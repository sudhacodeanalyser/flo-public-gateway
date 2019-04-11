export default interface AccountRecord {
  id: string,
  owner_user_id: string,
  account_name?: string,
  account_type?: string,
  group_id?: string,
  created_at?: string,
  updated_at?: string
}