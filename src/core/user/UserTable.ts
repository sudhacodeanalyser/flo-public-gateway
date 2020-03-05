import { inject, injectable } from 'inversify';
import DatabaseClient, { KeyMap } from '../../database/DatabaseClient';
import DatabaseTable from '../../database/DatabaseTable';
import { UserRecordData } from './UserRecord';
import { Patch } from '../../database/Patch';
import _ from 'lodash';
import { DynamoDbQuery } from '../../database/dynamo/DynamoDbClient';
import ConflictError from '../api/error/ConflictError';

@injectable()
class UserTable extends DatabaseTable<UserRecordData> {
  constructor(@inject('DatabaseClient') dbClient: DatabaseClient) {
    super(dbClient, 'User');
  }

  public async put(item: UserRecordData): Promise<UserRecordData> {
    const email = item.email;
    const existingUser = email && (await this.getByEmail(email));

    if (existingUser && item.id !== existingUser.id) {
      throw new ConflictError('Email already in use.');
    }

    return super.put({
      ...item,
      password: this.hashPassword(item.password)
    });
  }

  public async update(keys: KeyMap, patch: Patch): Promise<UserRecordData> {
    const emailPatch = _.find(patch.setOps, { key: 'email' });

    if (emailPatch) {
      const existingUser = await this.getByEmail(emailPatch.value);

      if (existingUser && keys.id !== existingUser.id) {
        throw new ConflictError('Email already in use.');
      }
    }

    return super.update(keys, patch);
  }

  public async getByEmail(email: string): Promise<UserRecordData | null> {
    const result = await this.query<DynamoDbQuery>({
      IndexName: 'EmailIndex',
      KeyConditionExpression: '#email = :email',
      ExpressionAttributeNames: {
        '#email': 'email'
      },
      ExpressionAttributeValues: {
        ':email': email.toLowerCase().trim()
      }
    });

    return result.length ? result[0] : null;
  }

  private hashPassword(password: string): string {
    // TODO Implement bcrypt
    return password;
  }
}

export default UserTable;