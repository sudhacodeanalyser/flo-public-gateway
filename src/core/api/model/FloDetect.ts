import * as t from 'io-ts';
import { convertEnumtoCodec } from '../enumUtils';
import { Omit, Expandable, AlarmEvent } from '../../api';

export interface FloDetectResponseFlowEvent {
  id: string;
  startAt: string;
  endAt: string;
  duration: string;
  totalGal: string;
  predicted: {
    id: string;
    displayText: string;
  };
  feedback?: {
    id: number;
    displayText: string;
    user?: {
      id: string;
    }
  };
  incident?: Expandable<AlarmEvent>,
  macAddress: string;
}

export interface FloDetectResponseEventItem {
  macAddress: string;
  error?: string;
  events: FloDetectResponseFlowEvent[];
}

export interface FloDetectResponseEventPage {
  params: {
    macAddress?: string;
    locationId?: string;
    from: string;
    to: string;
    tz: string;
    minGallons: number;
  },
  items: FloDetectResponseEventItem[];
}

export interface FloDetectResponseFixtures {
  params: {
    macAddress?: string;
    locationId?: string;
    from: string;
    to: string;
    tz: string;
    minGallons: number;
  };
  items: Array<{
    macAddress: string;
    error?: string;
    fixtures: Array<{
      id: number;
      displayText: string;
      totalEvents: number;
      totalGallons: number;
      totalSeconds: number;
    }>
  }>
}

export interface FloDetectResponseTrendsEvent {
  id: string;
  startAt: string;
  endAt: string;
  duration: number;
  totalGal: number;
  incidentId?: string;
  macAddress: string;
}

export interface FloDetectResponseTrendItem {
  macAddress: string;
  error?: string;
  events: FloDetectResponseTrendsEvent[];
}

export interface FloDetectResponseTrendsPage {
  params: {
    macAddress?: string;
    locationId?: string;
    from: string;
    to: string;
    tz: string;
    minGallons: number;
  },
  items: FloDetectResponseTrendItem[];
}
