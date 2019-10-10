import * as t from 'io-ts';
import {Expandable, TimestampedModel, Location, DeviceUpdate, DeviceType, DeviceModelType} from '../../api';

const PresenceRequestCodec = t.type({
    appName: t.string,
    appVersion: t.union([t.string, t.undefined]),
});

const PresenceDataCodec = t.intersection([
    PresenceRequestCodec,
    t.type({
        action: t.string,
        userId: t.string,
        accountId: t.union([t.string, t.undefined]),
        deviceId: t.union([t.array(t.string), t.undefined]),
        type: t.string,
        ipAddress: t.string
    })
]);

export const PresenceRequestValidator = t.exact(t.partial(PresenceRequestCodec.props));

export type PresenceRequest = t.TypeOf<typeof PresenceRequestValidator>;
export type PresenceData = t.TypeOf<typeof PresenceDataCodec>;