import { MemoizeMixin, memoized } from '../../memoize/MemoizeMixin';
import OnboardingLogTable from './OnboardingLogTable';
import { OnboardingLogRecord } from './OnboardingLogRecord';
import * as Option from 'fp-ts/lib/Option';
import { injectable } from 'inversify';

@injectable()
class MemoizedOnboardingLogTable extends MemoizeMixin(OnboardingLogTable) {

  @memoized()
  public async getCurrentState(icdId: string): Promise<OnboardingLogRecord | null> {
    return super.getCurrentState(icdId);
  }

  @memoized()
  public async getInstallEvent(icdId: string): Promise<Option.Option<OnboardingLogRecord>> {
    return super.getInstallEvent(icdId);
  }

  @memoized()
  public async getOutOfForcedSleepEvent(icdId: string): Promise<Option.Option<OnboardingLogRecord>> {
    return super.getOutOfForcedSleepEvent(icdId);
  }

  @memoized()
  public async getFullLog(icdId: string): Promise<OnboardingLogRecord[]> {
    return super.getFullLog(icdId);
  }
}

export default MemoizedOnboardingLogTable;