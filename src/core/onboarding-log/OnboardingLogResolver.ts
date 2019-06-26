import { inject, injectable } from 'inversify';
import { OnboardingEvent, OnboardingLog } from '../api';
import { Resolver } from '../resolver';
import OnboardingLogTable from './OnboardingLogTable';

@injectable()
class OnboardingLogResolver extends Resolver<OnboardingLog> {
  constructor(
    @inject('OnboardingLogTable') private onboardingLogTable: OnboardingLogTable
  ) {
    super();
  }

  public async isDeviceInstalled(icdId: string): Promise<boolean> {
    const onboardingLog = await this.onboardingLogTable.getCurrentState(icdId);

    if (onboardingLog === null) {
      return false;
    }

    return onboardingLog.event >= OnboardingEvent.INSTALLED;
  }
}

export { OnboardingLogResolver };

