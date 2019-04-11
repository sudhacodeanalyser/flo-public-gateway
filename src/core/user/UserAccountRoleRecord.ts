export default interface UserAccountRoleRecord {
  user_id: string,
  account_id: string,
  role: string[],
  created_at?: string,
  updated_at?: string
}