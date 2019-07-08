import * as t from 'io-ts';
import moment from 'moment';

const DateFromISOString = new t.Type<Date, string, unknown>(
  'DateFromISOString',
  (u): u is Date => u instanceof Date,
  (u, c) => {
    return t.string.validate(u, c)
      .chain(str => {
        const date = new Date(str);
        return isNaN(date.getTime()) ? t.failure(str, c) : t.success(date);
      });
  },
  a => a.toISOString()
);

const DateRangeCodec = t.type({
  startDate: DateFromISOString,
  endDate: t.union([t.undefined, DateFromISOString])
});
type DateRange = t.TypeOf<typeof DateRangeCodec>;

interface RestrictedDateRangeBrand {
  readonly RestrictedDateRange: unique symbol;
}

const RestrictedDateRangeCodec = t.brand(
  DateRangeCodec,
  (dateRange): dateRange is t.Branded<DateRange, RestrictedDateRangeBrand> => {
    const endDate = dateRange.endDate || new Date().toISOString();
    const diff = moment(endDate).diff(dateRange.startDate, 'days');
    return diff > 0 && diff <= 31;
  },
  'RestrictedDateRange'
);

export const getConsumption = t.type({
  query: t.intersection([
    RestrictedDateRangeCodec,
    t.partial({
      interval: t.union([t.literal('1h'), t.literal('1d')]),
      tz: t.string
    }),
    t.union([
      t.type({
        macAddress: t.string
      }),
      t.type({
        locationId: t.string
      })
    ])
  ])
});