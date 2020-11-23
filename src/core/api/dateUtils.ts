import moment from 'moment-timezone';

export const convertToLocalTimeWithOffset = (ds: string | undefined, tz: string = 'UTC'): string | undefined => ds ? moment.utc(ds).tz(tz).format() : ds;
