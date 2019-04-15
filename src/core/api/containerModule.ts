import { Container, ContainerModule, interfaces } from 'inversify';
import { LocationDao, DeviceDao, LocationUserDao, DaoDependencyFactoryFactory } from './api';

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
  bind<DeviceDao>('DeviceDao').to(DeviceDao);
  bind<LocationDao>('LocationDao').to(LocationDao);
  bind<LocationUserDao>('LocationUserDao').to(LocationUserDao);
  
  bind<DaoDependencyFactoryFactory>('DaoDependencyFactoryFactory').toFactory((context: interfaces.Context) => {

    return <T>(depId: string): () => T => {
      return memoizedGet<T>(context.container, depId);
    };
  });
});