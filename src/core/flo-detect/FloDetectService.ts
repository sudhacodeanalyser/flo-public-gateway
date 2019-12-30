import { injectable, inject } from 'inversify';
import FloDetectEventChronologyTable from './FloDetectEventChronologyTable';
import { FloDetectEventChronologyRecord } from './FloDetectEventChronologyRecord';
import FloDetectResultTable from './FloDetectResultTable';
import { FloDetectResultRecord, FloDetectResultRecordData } from './FloDetectResultRecord';
import { FloDetectEventPage, Device, DependencyFactoryFactory, FloDetectLearning, FloDetectComputation, FloDetectCompuationDuration, FloDetectEvent, FloDetectEventFeedback, FloDetectStatus } from '../api';
import * as Option from 'fp-ts/lib/Option';
import * as TaskEitherOption from '../../util/TaskEitherOption';
import { pipe } from 'fp-ts/lib/pipeable';
import moment from 'moment';
import { DeviceService } from '../service';
import * as TaskOption from 'fp-ts-contrib/lib/TaskOption';
import { fromPartialRecord } from '../../database/Patch';

@injectable()
class FloDetectService {
  private deviceServiceFactory: () => DeviceService
  constructor(
    @inject('FloDetectResultTable') private floDetectResultTable: FloDetectResultTable,
    @inject('FloDetectEventChronologyTable') private floDetectEventChronologyTable: FloDetectEventChronologyTable,
    @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    this.deviceServiceFactory = depFactoryFactory<DeviceService>('DeviceService');
  }

 public async getLatestComputation(macAddress: string, duration: FloDetectCompuationDuration): Promise<Option.Option<FloDetectComputation | FloDetectLearning>> {
    const durationInSeconds = duration === FloDetectCompuationDuration.TWENTY_FOUR_HOURS ?
     86400 :
     604800;

    return pipe(
      TaskEitherOption.fromOption<FloDetectLearning, Device>(await this.deviceServiceFactory().getByMacAddress(macAddress, {
        $select: {
          installStatus: true
        }
      })),
      TaskEitherOption.chain(device => {
        if (
          !device.installStatus.isInstalled || 
          !device.installStatus.installDate ||
          device.installStatus.installDate > moment().subtract(21, 'days').toISOString()
        ) {
          return TaskEitherOption.left({ 
            macAddress, 
            status: FloDetectStatus.LEARNING
          });
        } else {
          return TaskEitherOption.fromTaskOption(() => 
            this.floDetectResultTable.retrieveLatestByMacAddress(macAddress, durationInSeconds)
           );
        }            
      }),
      TaskEitherOption.map(floDetectResultRecord => {
        const floDetectComputation = FloDetectResultRecord.toModel(floDetectResultRecord);
        const cutOff = duration === FloDetectCompuationDuration.TWENTY_FOUR_HOURS ?
          moment().subtract(2, 'hours').startOf('hour').toISOString() :
          moment().subtract(36, 'hours').startOf('hour').toISOString();

        if (floDetectResultRecord.end_date >= cutOff) {
          return floDetectComputation;
        } else {
          return {
            ...floDetectComputation,
            isStale: true
          };
        }
      }),
      TaskEitherOption.fold(
        learning => async () => Option.some(learning as FloDetectLearning | FloDetectComputation),
        () => async () => Option.none,
        floDetectComputation => async () => Option.some(floDetectComputation)
       )
    )();
  }

  public async getEventChronologyPage(macAddress: string, computationId: string, startDate?: string, pageSize?: number, isDescending?: boolean): Promise<FloDetectEventPage> {
    const eventChronologyPage = await this.floDetectEventChronologyTable.retrieveAfterStartDate(
      macAddress,
      computationId,
      startDate || (isDescending ? new Date().toISOString() : new Date(0).toISOString()),
      pageSize,
      isDescending
    );

    return {
      items: eventChronologyPage.map(eventChronologyRecord => FloDetectEventChronologyRecord.toModel(eventChronologyRecord))
    };
  }

  public async submitEventFeedback(macAddress: string, computationId: string, startDate: string, feedback: FloDetectEventFeedback): Promise<FloDetectEvent> {
    const eventRecordData = FloDetectEventChronologyRecord.convertFeedbackToPartialRecord(feedback);
    const patch = fromPartialRecord(eventRecordData);
    const updatedEventRecordData = await this.floDetectEventChronologyTable.update(
      this.floDetectEventChronologyTable.composeKeys(
        macAddress,
        computationId,
        startDate
      ), 
      patch
    );

    return FloDetectEventChronologyRecord.toModel(updatedEventRecordData);
  } 

  public async getComputationById(computationId: string): Promise<Option.Option<FloDetectComputation>> {

    return pipe(
      await this.floDetectResultTable.getByComputationId(computationId),
      Option.map(result => FloDetectResultRecord.toModel(result))
    );
  }
}

export { FloDetectService };