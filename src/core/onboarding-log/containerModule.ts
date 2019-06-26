import { ContainerModule, interfaces } from 'inversify';
import { OnboardingLogResolver } from '../resolver';
import OnboardingLogTable from './OnboardingLogTable';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<OnboardingLogTable>('OnboardingLogTable').to(OnboardingLogTable);
  bind<OnboardingLogResolver>('OnboardingLogResolver').to(OnboardingLogResolver);
});