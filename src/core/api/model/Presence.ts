import * as t from 'io-ts';
import {Expandable, TimestampedModel, Location, DeviceUpdate, DeviceType, DeviceModelType} from '../../api';

const PresenceLocationData = t.type({
    locationIds: t.union([t.array(t.string), t.undefined]),
    deviceIds: t.union([t.array(t.string), t.undefined])
});

export const PresenceRequestCodec = t.type({
    appName: t.string,
    appVersion: t.union([t.string, t.undefined]),
});

const PresenceDataCodec = t.intersection([
    PresenceRequestCodec,
    PresenceLocationData,
    t.type({
        action: t.string,
        userId: t.string,
        accountId: t.union([t.string, t.undefined]),
        deviceId: t.union([t.array(t.string), t.undefined]),
        type: t.string,
        ipAddress: t.string
    })
]);

export const PresenceRequestValidator = t.exact(t.intersection([
    t.partial(PresenceRequestCodec.props),
    t.partial(PresenceLocationData.props)
]));

export type PresenceRequest = t.TypeOf<typeof PresenceRequestValidator>;
export type PresenceData = t.TypeOf<typeof PresenceDataCodec>;

const PresenceAdditionalDataCodec = t.union([
    t.type({ userId: t.string }),
    t.partial(PresenceLocationData.props)
]);

export const PresenceDataValidatorCodec = t.intersection([
    t.partial(PresenceRequestCodec.props),
    PresenceAdditionalDataCodec,
]);

export type PresenceAdditionalData = t.TypeOf<typeof PresenceAdditionalDataCodec>;
