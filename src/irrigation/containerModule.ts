import { ContainerModule, interfaces } from 'inversify';
import { IrrigationScheduleService } from '../core/device/IrrigationScheduleService';
import ComposedIrrigationScheduleService from './ComposedIrrigationScheduleService';

export default new ContainerModule((bind: interfaces.Bind) => {
  bind<IrrigationScheduleService>('IrrigationScheduleService').to(ComposedIrrigationScheduleService);
})