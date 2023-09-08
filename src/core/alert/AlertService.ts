import { injectable, inject } from 'inversify';
import AlertFeedbackTable from './AlertFeedbackTable';
import { AlertFeedbackRecord } from './AlertFeedbackRecord';
import { AlarmEvent, UserFeedback, UserFeedbackCodec, PaginatedResult, AlertFeedback, AlarmEventFilter, NewUserFeedback, Location, AlertReportDefinition, PropertyFilter, PropExpand } from '../api';
import * as Option from 'fp-ts/lib/Option';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { NotificationService } from '../notification/NotificationService';
import * as t from 'io-ts';
import * as _ from 'lodash';
import { LocationService } from '../location/LocationService';

@injectable()
class AlertService {

  constructor(
    @inject('AlertFeedbackTable') private alertFeedbackTable: AlertFeedbackTable,
    @inject('NotificationService') private notificationService: NotificationService,
    @inject('LocationService') private readonly locationService: LocationService
  ) {}

  public async submitFeedback(alarmEvent: AlarmEvent, userFeedback: UserFeedback, userId?: string): Promise<UserFeedback> {
    const alertFeedback = {
      userFeedback: userFeedback.feedback,
      incidentId: alarmEvent.id,
      deviceId: alarmEvent.deviceId,
      createdAt: new Date().toISOString()
    };

    const alertFeedbackRecord = AlertFeedbackRecord.fromModel({
      userId,
      alarmId: alarmEvent.alarm.id,
      systemMode: alarmEvent.systemMode,
      ...alertFeedback
    });

    const createdAlertFeedback = AlertFeedbackRecord.toModel(await this.alertFeedbackTable.put(alertFeedbackRecord));

    return {
      userId,
      createdAt: createdAlertFeedback.createdAt,
      feedback: createdAlertFeedback.userFeedback
    };
  }

  public async getAlarmEventsByFilter(filters: AlarmEventFilter, expandLocationProps?: PropExpand): Promise<PaginatedResult<AlarmEvent>> {
    const unitLocations = filters.locationId ? 
      await this.locationService.getUnitLocations(filters.locationId) : 
      undefined;
  
    const enrichedFilters = {
      ...filters,
      ...(!_.isEmpty(unitLocations) && { locationId: unitLocations })
    };

    const alarmEvents = await this.notificationService.getAlarmEventsByFilter(enrichedFilters);
    const alarmEventsWithFeedback = await Promise.all(
      alarmEvents.items.map(async alarmEvent => this.joinAlarmEventWithFeedback(alarmEvent))
    );

    const expandedItems = expandLocationProps ? 
      await this.attachLocationInfo(alarmEventsWithFeedback, expandLocationProps) :
      alarmEventsWithFeedback;

    return {
      ...alarmEvents,
      items: expandedItems
    }
  }

  public async getAlarmEvent(incidentId: string, lang?: string, unitSystem?: string): Promise<AlarmEvent> {
    const filters = {
      ...lang && { lang },
      ...unitSystem && { unitSystem },
    }
    const alarmEvent = await this.notificationService.getAlarmEvent(incidentId, filters);

    return this.joinAlarmEventWithFeedback(alarmEvent);
  }

  public async saveUserFeedback(incidentId: string, userFeedback: NewUserFeedback, force?: boolean): Promise<void> {
    return this.notificationService.saveUserFeedback(incidentId, userFeedback, force);
  }

  public async buildAlertReport(alertReportDefinition: AlertReportDefinition): Promise<PaginatedResult<AlarmEvent>> {
    const isPropertyFilter = (obj: any): obj is PropertyFilter => {
      return obj.hasOwnProperty('property');
    };

    const propertyFilters = alertReportDefinition.basic.filters.items
      .filter(isPropertyFilter)
      .reduce((obj, propertyFilter: PropertyFilter) => ({
        ...obj,
        [propertyFilter.property.name]: propertyFilter.property.values
      }), {});

    const filters: AlarmEventFilter = {
      ...propertyFilters,
      ...(alertReportDefinition.view || {})
    };    

    const unitLocations = filters.locationId ? await this.locationService.getUnitLocations(filters.locationId) : undefined;
    const enrichedFilters = {
      ...filters,
      ...(!_.isEmpty(unitLocations) && { locationId: unitLocations })
    };

    const alarmEvents = await this.notificationService.getAlarmEventsByFilter(enrichedFilters);
    const alarmEventsWithFeedback = await Promise.all(
      alarmEvents.items.map(async alarmEvent => this.joinAlarmEventWithFeedback(alarmEvent))
    );

    return {
      ...alarmEvents,
      items: alarmEventsWithFeedback
    }
  }

  private async joinAlarmEventWithFeedback(alarmEvent: AlarmEvent): Promise<AlarmEvent> {

    return pipe(
      await this.getFeedback(alarmEvent.deviceId, alarmEvent.id),
      Option.fold(
        () => Either.left([]),
        alertFeedback =>
          t.exact(UserFeedbackCodec).decode({
            userId: alertFeedback.userId,
            createdAt: alertFeedback.createdAt,
            feedback: alertFeedback.userFeedback
          })
      ),
      Either.fold(
        () => alarmEvent,
        userFeedback => ({ ...alarmEvent, userFeedback: [userFeedback] })
      )
    );
  }

  private async getFeedback(deviceId: string, incidentId: string): Promise<Option.Option<AlertFeedback>> {
    return pipe(
      Option.fromNullable(await this.alertFeedbackTable.get({ icd_id: deviceId, incident_id: incidentId })),
      Option.map(alertFeedbackRecord => AlertFeedbackRecord.toModel(alertFeedbackRecord))
    );
  }

  private async attachLocationInfo(events: AlarmEvent[], expandLocationProps?: PropExpand): Promise<AlarmEvent[]> {
    const locationIds = new Set(events.map(e => e.locationId));
    const locations = await Promise.all([...locationIds]
      .map(id => this.locationService.getLocation(id, expandLocationProps))
    );
    const locationsById = _.chain(locations)
      .flatMap(location => pipe(location,
        Option.fold(
          () => [],
          l => [_.pickBy(l, v => v !== null)]
        )
      ))
      .keyBy('id')
      .value();

    return events.map(e => {
      const location = locationsById[e.locationId]
      return {
        ...e,
        ...(location && { location })
      };
    });
  }
}

export { AlertService };
