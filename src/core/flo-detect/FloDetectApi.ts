import { injectable, inject } from 'inversify';
import { HttpService } from '../../http/HttpService';

// ============================================

// Internal service API model =================

// Events =====================================

export interface FloDetectApiFlowEvent {
  id: string;
  startAt: string;
  endAt: string;
  totalGal: number;
  predictedId: number;
  predictedDisplayText: number;
  feedbackDisplayText?: string;
  feedbackUserId?: string;
  feedbackId?: number;
  incidentId?: string;
}

export interface FloDetectApiEventItem {
  deviceId: string;
  error?: string;
  events: null | FloDetectApiFlowEvent[];
}

export interface FloDetectApiEventPage {
  params: {
    deviceId: string[];
    from: string;
    to: string;
    minGallons: number;
  },
  items: FloDetectApiEventItem[]
}

// Fixtures  =====================================

export interface FloDetectApiFixtures {
  params: {
    deviceId: string[];
    from: string;
    to: string;
    minGallons: number;
  },
  items: Array<{
    deviceId: string;
    error?: string;
    fixtures: null | Array<{
      id: number;
      count: number;
      displayText: string;
      totalGallons: number;
      totalSeconds: number;
    }>
  }>
}


// Irrigation  ================================

export interface FloDetectApiIrrigationSchedule {
  deviceId: string;
  floDetect: {
    updatedAt: string;
    schedule: Array<{
      dayOfWeek: string[];
      startTime: string;
      endTime: string;
    }>;
  };
  user?: {
    updatedAt: string;
    schedule: Array<{
      dayOfWeek: string[];
      startTime: string;
      endTime: string;
    }>;
  };
}

// ============================================


@injectable()
class FloDetectApi extends HttpService {
  @inject('FloDetectApiUrl') private readonly serviceUrl: string;

  public async getEvents(
    macAddresses: string[], 
    opts?: { from?: Date, to?: Date, limit?: number, offset?: number, lang?: string }
  ): Promise<FloDetectApiEventPage> {
    return this.sendRequest({
      method: 'GET',
      url: `${ this.serviceUrl }/events`,
      params: {
        deviceId: macAddresses.join(','),
        ...(opts && {
          ...opts,
          from: opts.from && opts.from.toISOString(),
          to: opts.to && opts.to.toISOString()
        })
      }
    });
  }

  public async getEventById(eventId: string): Promise<FloDetectApiFlowEvent> {
    return this.sendRequest({
      method: 'GET',
      url: `${ this.serviceUrl }/events/${ eventId }`
    });
  }

  public async getFixtures(
    macAddresses: string[],
    opts?: { from?: Date, to?: Date, lang?: string }
  ): Promise<FloDetectApiFixtures> {
    return this.sendRequest({
      method: 'GET',
      url: `${ this.serviceUrl }/fixtures`,
      params: {
        deviceId: macAddresses.join(','),
        ...(opts && {
          ...opts,
          from: opts.from && opts.from.toISOString(),
          to: opts.to && opts.to.toISOString()
        })
      }
    });
  }

  public async submitFeedback(eventId: string, feedbackId: number, userId?: string): Promise<void> {
    await this.sendRequest({
      method: 'POST',
      url: `${ this.serviceUrl }/events/${ eventId }`,
      body: {
        feedbackId,
        feedbackUserId: userId
      }
    });
  }

  public async getIrrigationSchedule(macAddress: string): Promise<FloDetectApiIrrigationSchedule | null> {
    try {
      return (await this.sendRequest({
        method: 'GET',
        url: `${ this.serviceUrl }/irrigation/${ macAddress }`
      }));
    } catch (err) {
      if (err.statusCode === 404) {
        return null;
      } 

      throw err;
    }
  }
}

export { FloDetectApi }; 