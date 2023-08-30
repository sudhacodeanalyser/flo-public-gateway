import { inject, injectable, unmanaged } from 'inversify';
import DatabaseTable from './DatabaseTable';
import DatabaseClient, { KeyMap } from './DatabaseClient';
import Dataloader from 'dataloader';
import NotFoundError from '../core/api/error/NotFoundError';
import stringify from 'fast-json-stable-stringify';

type DataloaderMap = Map<any, Dataloader<any, any>>;

@injectable()
class BatchedDatabaseTable<T> extends DatabaseTable<T> {
  protected defaultBatchSize: number = 100;
  protected dataloader: Dataloader<string, T>;
  @inject('Loaders') private dataloaderMap: DataloaderMap;

  constructor(
    @unmanaged() protected dbClient: DatabaseClient,
    @unmanaged() public tableName: string
  ) {
    super(dbClient, tableName);
  }

  public async get(key: KeyMap): Promise<T | null> {
    try {
      const dataloader = this.ensureDataloader();
      const result = await dataloader.load(stringify(key));

      if (result instanceof NotFoundError) {
        return null;
      }

      return result;
    } catch (err) {

      if (err instanceof NotFoundError) {
        return null;
      } else {
        throw err;
      }

    }
  }

  protected async batchLoad(keys: string[]): Promise<Array<T | Error>> {
    const keyMaps = keys.map(key => JSON.parse(key) as KeyMap);
    const result = await this.batchGet(keyMaps, this.defaultBatchSize);

    return result.map(item => item === null ? new NotFoundError() : item);
  }

  protected ensureDataloader(): Dataloader<string, T> {
    if (!this.dataloader) {
      const dataloaderKey = `${ this.constructor.name }_get`;

      if (this.dataloaderMap) {

        if (!this.dataloaderMap.get(dataloaderKey)) {
          this.dataloaderMap.set(dataloaderKey, new Dataloader<string, T>(keys => this.batchLoad(keys.map(k => k.toString()))));
        } 

        this.dataloader = this.dataloaderMap.get(dataloaderKey) as Dataloader<string, T>;
      } else {
        this.dataloader = new Dataloader<string, T>(keys => this.batchLoad(keys.map(k => k.toString())));
      }        
    }

    return this.dataloader;    
  }
}

export default BatchedDatabaseTable;