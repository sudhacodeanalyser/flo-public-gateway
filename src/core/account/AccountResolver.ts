import { inject, injectable, interfaces } from 'inversify';
import { AccountRecordData, AccountRecord } from './AccountRecord';
import { Account, DependencyFactoryFactory } from '../api/api';
import { Resolver, PropertyResolverMap, LocationResolver } from '../resolver';
import AccountTable from './AccountTable';
import { fromPartialRecord } from '../../database/Patch';

@injectable()
class AccountResolver extends Resolver<Account> {
  protected propertyResolverMap: PropertyResolverMap<Account> = {}
  private locationResolverFactory: () => LocationResolver

  constructor(
    @inject('AccountTable') private accountTable: AccountTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.locationResolverFactory = depFactoryFactory<LocationResolver>('LocationResolver');
  }

  public async getAccount(id: string, expandProps: string[] = []): Promise<Account | null> {
    const accountRecordData: AccountRecordData | null = await this.accountTable.get({ id });

    if (accountRecordData === null) {
      return null;
    }

    const account = new AccountRecord(accountRecordData).toModel();
    // const resolvedProps = await this.resolveProps(account, expandProps);

    return account;
  }

  public async getAccountByOwnerUserId(ownerUserId: string): Promise<Account | null> {
    const accountRecordData = await this.accountTable.getByOwnerUserId(ownerUserId);

    if (accountRecordData === null) {
      return null;
    }

    return new AccountRecord(accountRecordData).toModel();
  }
}

export { AccountResolver };