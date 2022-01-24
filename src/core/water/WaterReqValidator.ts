import * as t from 'io-ts';
import moment from 'moment';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

export interface ISODateStringBrand {
  readonly ISODateString: unique symbol
}

export type ISODateString = t.Branded<string, ISODateStringBrand>

interface ISODateStringCodec extends t.Type<ISODateString, string, unknown> {}

export const ISODateString: ISODateStringCodec = t.brand(
  t.string,
  (s): s is ISODateString => {
    return pipe(
      t.string.decode(s),
      E.chain(str => {
        const decoded = decodeURIComponent(str);
        const date = new Date(decoded);

        return isNaN(date.getTime()) ? E.left([]) : E.right(str)
      }),
      E.fold(() => false, () => true)
    );
  },
  'ISODateString'
);

const DateRangeCodec = t.type({
  startDate: ISODateString,
  endDate: t.union([t.undefined, ISODateString]),
  interval: t.union([t.undefined, t.literal('1h'), t.literal('1d'), t.literal('1m')])
});
type DateRange = t.TypeOf<typeof DateRangeCodec>;

interface RestrictedDateRangeBrand {
  readonly RestrictedDateRange: unique symbol;
}

const RestrictedDateRangeCodec = t.brand(
  DateRangeCodec,
  (dateRange): dateRange is t.Branded<DateRange, RestrictedDateRangeBrand> => {

    const startDate = moment(dateRange.startDate);
    const now = moment(new Date().toUTCString());
    // Start date must be before NOW (shifted 24h due to unknown TZ)
    if (!startDate.isBefore(now.add(1, 'day'))) {
      return false;
    }

    const endDate = dateRange.endDate || new Date().toISOString();
    const diff = moment(endDate).diff(dateRange.startDate, 'months');

    if (diff > 12 && dateRange.interval !== '1m') {
      return false;
    } else if (diff > 3 && !(dateRange.interval === '1d' || dateRange.interval === '1m')) {
      return false;
    }
    // was 1 year originally, then we allow for 37 months
    return diff >= 0 && diff <= 37;
  },
  'RestrictedDateRange'
);

export const getConsumption = t.type({
  query: t.intersection([
    RestrictedDateRangeCodec,
    t.partial({
      tz: t.string,
      macAddress: t.string,
      locationId: t.union([t.array(t.string), t.string]),
      userId: t.string,
    }),
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
      tz: t.string,
      cache: t.union([t.string, t.number, t.boolean]),
    }),
    t.type({
      macAddress: t.string
    })
  ])
});