import { injectable, inject } from 'inversify';
import AlertFeedbackTable from './AlertFeedbackTable';
import { AlertFeedbackRecord } from './AlertFeedbackRecord';
import { AlarmEvent, UserFeedback, UserFeedbackCodec, PaginatedResult, AlertFeedback, AlarmEventFilter, NewUserFeedback, Location, AlertReportDefinition, PropertyFilter } from '../api';
import * as Option from 'fp-ts/lib/Option';
import * as Either from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { NotificationServiceFactory, NotificationService } from '../notification/NotificationService';
import { injectHttpContext, interfaces } from 'inversify-express-utils';
import * as t from 'io-ts';
import _ from 'lodash';
import { LocationService } from '../location/LocationService';

@injectable()
class AlertService {
  private notificationServiceFactory: () => NotificationService;

  constructor(
    @inject('AlertFeedbackTable') private alertFeedbackTable: AlertFeedbackTable,
    @inject('NotificationServiceFactory') notificationServiceFactory: NotificationServiceFactory,
    @inject('LocationService') private readonly locationService: LocationService,
    @injectHttpContext private readonly httpContext: interfaces.HttpContext
  ) {

    this.notificationServiceFactory = () => {
      if (_.isEmpty(this.httpContext)) {
        throw new Error('HTTP context unavailable.');
      }

      return notificationServiceFactory.create(this.httpContext.request)
    };
  }

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
      createdAt: new Date().toISOString(),
      ...alertFeedback
    });

    const createdAlertFeedback = AlertFeedbackRecord.toModel(await this.alertFeedbackTable.put(alertFeedbackRecord));

    return {
      userId,
      createdAt: createdAlertFeedback.createdAt,
      feedback: createdAlertFeedback.userFeedback
    };
  }

  public async getAlarmEventsByFilter(filters: AlarmEventFilter): Promise<PaginatedResult<AlarmEvent>> {
    const unitLocations = filters.locationId ? await this.fetchUnitLocations(filters.locationId) : undefined;
  
    const enrichedFilters = {
      ...filters,
      ...(!_.isEmpty(unitLocations) && { locationId: unitLocations })
    };

    const alarmEvents = await this.notificationServiceFactory().getAlarmEventsByFilter(enrichedFilters);
    const alarmEventsWithFeedback = await Promise.all(
      alarmEvents.items.map(async alarmEvent => this.joinAlarmEventWithFeedback(alarmEvent))
    );

    return {
      ...alarmEvents,
      items: alarmEventsWithFeedback
    }
  }

  public async getAlarmEvent(incidentId: string, lang?: string, unitSystem?: string): Promise<AlarmEvent> {
    const filters = {
      ...lang && { lang },
      ...unitSystem && { unitSystem },
    }
    const alarmEvent = await this.notificationServiceFactory().getAlarmEvent(incidentId, filters);

    return this.joinAlarmEventWithFeedback(alarmEvent);
  }

  public async saveUserFeedback(incidentId: string, userFeedback: NewUserFeedback, force?: boolean): Promise<void> {
    return this.notificationServiceFactory().saveUserFeedback(incidentId, userFeedback, force);
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

    const unitLocations = filters.locationId ? await this.fetchUnitLocations(filters.locationId) : undefined;
    const enrichedFilters = {
      ...filters,
      ...(!_.isEmpty(unitLocations) && { locationId: unitLocations })
    };

    const alarmEvents = await this.notificationServiceFactory().getAlarmEventsByFilter(enrichedFilters);
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

  private async fetchUnitLocations(locationIds: string[]): Promise<string[]> {
    const locations = await Promise.all(
      locationIds.map(async l => this.locationService.getLocation(l, {
        $select: {
          id: true,
          account: {
            $select: {
              id: true
            }
          },
          ['class']: true
        }
      }))
    );
     
    return _.flatten((await Promise.all(_.map(locations, async (maybeLocation) => 
      pipe(
        maybeLocation,
        Option.fold(
          async () => [],
          async l => l.class.key === 'unit' ? [l.id] : this.getAllChildrenUnits(l)
        )
      )
    ))));
  }

  private async getAllChildrenUnits(location: Location): Promise<string[]> {
    const childIds = await this.locationService.getAllChildren(location);
    const childLocations = await Promise.all(
      childIds.map(({ child_id: childId }) => 
        this.locationService.getLocation(childId, {
          $select: {
            id: true,
            ['class']: true
          }
        })
      )
    );
    return _.flatMap(childLocations, maybeChildLocation => 
      pipe(
        maybeChildLocation,
        Option.fold(
          () => [],
          childLocation => childLocation.class.key === 'unit' ? [childLocation.id] : []
        )
      )
    )
  }
}

export { AlertService };
