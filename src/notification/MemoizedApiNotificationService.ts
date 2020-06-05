import { inject, injectable } from 'inversify';
import { memoized, MemoizeMixin } from '../memoize/MemoizeMixin'; 
import { ApiNotificationService } from './ApiNotificationService';
import {
  Alarm,
  AlarmEvent,
  AlarmListResult,
  ClearAlertResponse,
  Device,
  DeviceAlarmSettings,
  NotificationStatistics,
  PaginatedResult, Receipt, SendWithUsEvent,
  TwilioStatusEvent,
  UpdateAlarmSettings,
  FilterState,
  AlarmEventFilter,
  NewUserFeedback,
  StatsFilter,
  RetrieveAlarmSettingsFilter,
  EntityAlarmSettings,
  DependencyFactoryFactory
} from '../core/api';

@injectable()
class MemoizedApiNotificationService extends MemoizeMixin(ApiNotificationService) {

  @memoized((args: any[]) => args)
  public async retrieveStatisticsInBatch(...args: any[]): Promise<NotificationStatistics> {
    const [[filters]] = args;

    return super.retrieveStatisticsInBatch(filters);
  }
}

export { MemoizedApiNotificationService };