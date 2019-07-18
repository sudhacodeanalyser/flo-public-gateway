import { injectable } from 'inversify';
import DeviceTable from './DeviceTable';
import { DeviceRecordData } from './DeviceRecord';
import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';
import { KeyMap } from '../../database/DatabaseClient';

@injectable()
class MemoizedDeviceTable extends MemoizeMixin(DeviceTable) {

  @memoized()
  public async get(key: KeyMap): Promise<DeviceRecordData | null> {
    const result = await super.get(key);

    if (result) {
      this.primeMethodLoader('getByMacAddress', { id: result.id }, result);
    }

    return result;
  }

  @memoized()
  public async getAllByLocationId(locationId: string): Promise<DeviceRecordData[]> {
    const results = await super.getAllByLocationId(locationId);

    results.forEach(result => {
      this.primeMethodLoader('getByMacAddress', { id: result.id }, result);
      this.primeMethodLoader('get', { id: result.id }, result);
    });  

    return results;
  }

  @memoized()
  public async getByMacAddress(macAddress: string): Promise<DeviceRecordData | null> {
    const result = await super.getByMacAddress(macAddress);

    if (result) {
      this.primeMethodLoader('get', { id: result.id }, result);
    }

    return result;
  }
}

export default MemoizedDeviceTable;