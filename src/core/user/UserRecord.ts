export default interface UserRecord {
  id: string,
  email: string,
  password: string,
  is_active?: boolean
}