import { inject, injectable, targetName } from 'inversify';
import { PropertyResolverMap, Resolver } from '../resolver';
import { 
  FloDetectApi, 
  FloDetectApiEventPage, 
  FloDetectApiFlowEvent, 
  FloDetectApiEventItem, 
  FloDetectApiFixtures, 
  FloDetectApiEventFilters, 
  FloDetectApiFixtureFilters 
} from './FloDetectApi';
import { morphism, StrictSchema } from 'morphism';
import { 
  DependencyFactoryFactory,
  PropExpand,
  FloDetectEventFeedback, 
  FloDetectStatus,
  FloDetectResponseFlowEvent,
  FloDetectResponseEventItem,
  FloDetectResponseEventPage,
  FloDetectResponseFixtures
} from '../api';
import { AlertService } from '../service';

const ApiToResponseFlowEventSchema: StrictSchema<FloDetectResponseFlowEvent, FloDetectApiFlowEvent> = {
  id: 'id',
  startAt: 'startAt',
  endAt: 'endAt',
  totalGal: 'totalGal',
  duration: 'duration',
  predicted: {
    id: 'predictedId',
    displayText: 'predictedDisplayText'
  },
  feedback: (input: FloDetectApiFlowEvent) => {
    return input.feedbackId !== undefined ? 
      {
        id: input.feedbackId,
        displayText: input.feedbackDisplayText || '',
        user: input.feedbackUserId !== undefined ?
          { id: input.feedbackUserId } :
          undefined
      } : 
      undefined;
  },
  incident: (input: FloDetectApiFlowEvent) => {
    return input.incidentId !== undefined ?
      { id: input.incidentId } :
      undefined;
  }
}

const ApiToResponseEventItem: StrictSchema<FloDetectResponseEventItem, FloDetectApiEventItem> = {
  macAddress: 'deviceId',
  error: 'error',
  events: (input: FloDetectApiEventItem) => {
    return (input.events || []).map(
      apiEvent => morphism(
        ApiToResponseFlowEventSchema, 
        apiEvent
      )
    );
  }
}

const ApiToResponsePageSchema: StrictSchema<FloDetectResponseEventPage, FloDetectApiEventPage> = {
  params: {
    macAddress: () => undefined,
    locationId: () => undefined,
    from: 'params.from',
    to: 'params.to',
    tz: () => 'Etc/UTC',
    minGallons: 'params.minGallons'
  },
  items: (input: FloDetectApiEventPage) => {
    return input.items.map(apiItem => morphism(ApiToResponseEventItem, apiItem));
  }
}

const ApiToResponseFixtures: StrictSchema<FloDetectResponseFixtures, FloDetectApiFixtures> = {
  params: {
    macAddress: () => undefined,
    locationId: () => undefined,
    from: 'params.from',
    to: 'params.to',
    tz: () => 'Etc/UTC',
    minGallons: 'params.minGallons'
  },
  items: (input: FloDetectApiFixtures) => {
    return input.items.map(apiItem => ({
      macAddress: apiItem.deviceId,
      error: apiItem.error,
      fixtures: (apiItem.fixtures || []).map(fixture => ({
        id: fixture.id,
        displayText: fixture.displayText,
        totalGallons: fixture.totalGallons,
        totalEvents: fixture.count,
        totalSeconds: fixture.totalSeconds
      }))
    }));
  }
};

@injectable()
class FloDetectResolver extends Resolver<FloDetectResponseFlowEvent> {
  protected propertyResolverMap: PropertyResolverMap<FloDetectResponseFlowEvent> = {
    incident: async (floDetectEvent: FloDetectResponseFlowEvent, shouldExpand = false) => {

      if (!shouldExpand || !floDetectEvent.incident) {
        return floDetectEvent.incident;
      }

      return this.alertServiceFactory().getAlarmEvent(floDetectEvent.incident.id);
    }
  };

  private alertServiceFactory: () => AlertService;

  constructor(
     @inject('FloDetectApi') private floDetectApi: FloDetectApi,
     @inject('DependencyFactoryFactory') depFactoryFactory: DependencyFactoryFactory
  ) {
    super();

    this.alertServiceFactory = depFactoryFactory('AlertService');
  }

  public async getEvents(macAddresses: string[], filters?: FloDetectApiEventFilters, expandProps?: PropExpand): Promise<FloDetectResponseEventPage> {
    const rawEvents = await this.floDetectApi.getEvents(macAddresses, filters);
    const eventPage = morphism(ApiToResponsePageSchema, rawEvents);
    const resolvedItems = await Promise.all(
      eventPage.items
        .map(async item => ({
          ...item,
          events: await Promise.all(
            item.events.map(async event => ({
              ...event,
              ...(await this.resolveProps(event, expandProps))
            }))
          )
        }))
      );

    return {
      ...eventPage,
      items: resolvedItems
    };
  }

  public async getEventById(eventId: string, expandProps?: PropExpand): Promise<FloDetectResponseFlowEvent> {
    const rawEvent = await this.floDetectApi.getEventById(eventId);
    const event = morphism(ApiToResponseFlowEventSchema, rawEvent);
    
    return {
      ...event,
      ...(await this.resolveProps(event, expandProps)),
    };
  }

  public async getFixtures(macAddresses: string[], filters: FloDetectApiFixtureFilters): Promise<FloDetectResponseFixtures> {
    const result = await this.floDetectApi.getFixtures(macAddresses, filters);
    
    return morphism(ApiToResponseFixtures, result);
  }
}

export { FloDetectResolver };