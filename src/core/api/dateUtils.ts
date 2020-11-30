import moment from 'moment-timezone';

export const convertToLocalTimeWithOffset = (ds: string, tz: string = 'UTC'): string => moment.utc(ds).tz(tz).format();
