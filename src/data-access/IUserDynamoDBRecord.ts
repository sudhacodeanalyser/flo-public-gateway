export default interface IUserDynamoDBRecord {
  id: string,
  email: string,
  password: string,
  is_active?: boolean
}