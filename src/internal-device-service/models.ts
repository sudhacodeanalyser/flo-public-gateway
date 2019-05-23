import * as t from 'io-ts';

const InternalDeviceCodec = t.type({
  createdTime: t.string,
  deviceId: t.string,
  fwProperties: t.object,
  fwVersion: t.string,
  isConnected: t.boolean,
  lastHeardFromTime: t.string,
  updatedTime: t.string,
});

type InternalDevice = t.TypeOf<typeof InternalDeviceCodec>;

export { InternalDevice, InternalDeviceCodec };

