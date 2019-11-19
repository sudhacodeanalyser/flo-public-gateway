import { inject, injectable } from 'inversify';
import { UserAccountRoleRecordData } from './UserAccountRoleRecord';
import UserAccountRoleTable from './UserAccountRoleTable';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';

@injectable()
class MemoizedUserAccountRoleTable extends MemoizeMixin(UserAccountRoleTable) {

  @memoized()
  public async getByUserId(userId: string): Promise<UserAccountRoleRecordData | null> {
    return super.getByUserId(userId);
  }

  @memoized()
  public async getAllByAccountId(accountId: string): Promise<UserAccountRoleRecordData[]> {
    return super.getAllByAccountId(accountId);
  }

  @memoized()
  public async getByAccountId(accountId: string): Promise<UserAccountRoleRecordData | null> {
    return super.getByAccountId(accountId);
  }
}

export default MemoizedUserAccountRoleTable;