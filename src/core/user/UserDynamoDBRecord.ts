export default interface UserDynamoDBRecord {
  id: string,
  email: string,
  password: string,
  is_active?: boolean
}