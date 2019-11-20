import { inject, injectable } from 'inversify';
import { UserLocationRoleRecordData } from './UserLocationRoleRecord';
import UserLocationRoleTable from './UserLocationRoleTable';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';

@injectable()
class MemoizedUserLocationRoleTable extends MemoizeMixin(UserLocationRoleTable) {

  @memoized()
  public async getAllByUserId(userId: string): Promise<UserLocationRoleRecordData[]> {
    return super.getAllByUserId(userId);
  }

  @memoized()
  public async getAllByLocationId(locationId: string): Promise<UserLocationRoleRecordData[]> {
    return super.getAllByLocationId(locationId);
  }
}

export default MemoizedUserLocationRoleTable;