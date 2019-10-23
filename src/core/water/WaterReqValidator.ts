import * as t from 'io-ts';
import moment from 'moment';
import { either } from 'fp-ts/lib/Either';

const DateFromURIEncodedISOString = new t.Type<Date, string, unknown>(
  'DateFromISOString',
  (u): u is Date => u instanceof Date,
  (u, c) => {
    return either.chain(t.string.validate(u, c), str => {
      const decoded = decodeURIComponent(str);
      const date = new Date(decoded);
      return isNaN(date.getTime()) ? t.failure(str, c) : t.success(date);
    });
  },
  a => a.toISOString()
);

const DateRangeCodec = t.type({
  startDate: DateFromURIEncodedISOString,
  endDate: t.union([t.undefined, DateFromURIEncodedISOString]),
  interval: t.union([t.undefined, t.literal('1h'), t.literal('1d'), t.literal('1m')])
});
type DateRange = t.TypeOf<typeof DateRangeCodec>;

interface RestrictedDateRangeBrand {
  readonly RestrictedDateRange: unique symbol;
}

const RestrictedDateRangeCodec = t.brand(
  DateRangeCodec,
  (dateRange): dateRange is t.Branded<DateRange, RestrictedDateRangeBrand> => {

    // Start date must be after NOW
    if (moment().isBefore(dateRange.startDate)) {
      return false;
    }

    const endDate = dateRange.endDate || new Date().toISOString();
    const diff = moment(endDate).diff(dateRange.startDate, 'days');

    if (diff >= 93 && dateRange.interval !== '1m') {
      return false;
    }

    // 1 year max
    return diff >= 0 && diff <= 397; // 365 days + 1 for leap year + 31 for an extra month
  },
  'RestrictedDateRange'
);

export const getConsumption = t.type({
  query: t.intersection([
    RestrictedDateRangeCodec,
    t.partial({
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

export const getAverages = t.type({
  query: t.intersection([
    t.partial({
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

export const getMetrics = t.type({
  query: t.intersection([
    RestrictedDateRangeCodec,
    t.partial({
      tz: t.string
    }),
    t.type({
      macAddress: t.string
    })
  ])
});