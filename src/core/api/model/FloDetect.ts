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
  incident?: Expandable<AlarmEvent>
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
