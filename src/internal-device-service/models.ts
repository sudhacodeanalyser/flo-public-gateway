import * as t from 'io-ts';
import _ from 'lodash';

const FwPropertiesCodec = t.type({
  fw_ver: t.string,
  motor_delay_close: t.number,
  motor_delay_open: t.number,
  reboot_count: t.number,
  serial_number: t.string,
  system_mode: t.number,
  valve_state: t.number,
  wifi_sta_enc: t.string,
  wifi_sta_ssid: t.string
});

const InternalDeviceCodec = t.type({
  createdTime: t.string,
  deviceId: t.string,
  fwProperties: FwPropertiesCodec,
  fwVersion: t.string,
  isConnected: t.boolean,
  lastHeardFromTime: t.string,
  updatedTime: t.string,
});

type FwProperties = t.TypeOf<typeof FwPropertiesCodec>;
type InternalDevice = t.TypeOf<typeof InternalDeviceCodec>;


interface FwPropertiesCodecAtLeastOneBrand {
  readonly FwPropertiesAtLeastOne: unique symbol
}

const FwPropertiesMutableAtLeastOne = t.brand(
  t.partial(FwPropertiesCodec.props),
  (obj): obj is t.Branded<t.TypeOf<typeof FwPropertiesCodec>, FwPropertiesCodecAtLeastOneBrand> => !_.isEmpty(obj),
  'FwPropertiesAtLeastOne'
);

const FwPropertiesValidator = t.exact(FwPropertiesMutableAtLeastOne);

const defaultInternalDeviceServicePayload = {
  "deviceId": "",
  "isConnected": false,
  "fwVersion": "",
  "createdTime": "0001-01-01T00:00:00Z",
  "lastHeardFromTime": "0001-01-01T00:00:00Z",
  "updatedTime": "0001-01-01T00:00:00Z",
  "fwProperties": {
    "fw_ver": "",
    "motor_delay_open": 0,
    "motor_delay_close": 0,
    "reboot_count": 0,
    "serial_number": "",
    "system_mode": 0,
    "valve_state": 0,
    "wifi_sta_ssid": "",
    "wifi_sta_enc": ""
  }
};

export {FwProperties, InternalDevice, FwPropertiesCodec, InternalDeviceCodec, FwPropertiesValidator, defaultInternalDeviceServicePayload};