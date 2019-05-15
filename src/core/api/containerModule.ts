import { ContainerModule, interfaces } from 'inversify';
import { DependencyFactoryFactory } from '../api';

function memoizedGet<T>(container: interfaces.Container, serviceId: string): () => T {
    let instance: T | null = null

    return () => {
      if (!instance) {
        instance = container.get<T>(serviceId);
      }

      return instance;
    };

}

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<DependencyFactoryFactory>('DependencyFactoryFactory').toFactory((context: interfaces.Context) => {

    return <T>(depId: string): () => T => {
      return memoizedGet<T>(context.container, depId);
    };
  });
});