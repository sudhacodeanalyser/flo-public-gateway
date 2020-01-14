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
  startDate: t.union([t.undefined, ISODateString]),
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

    if (!dateRange.startDate) {
      return true;
    }

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