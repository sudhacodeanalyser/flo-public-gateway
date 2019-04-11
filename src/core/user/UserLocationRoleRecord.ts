export default interface UserLocationRoleRecord {
  user_id: string,
  location_id: string,
  roles: string[],
  created_at?: string,
  updated_at?: string
}