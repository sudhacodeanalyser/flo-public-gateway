import * as t from 'io-ts';

const FwPropertiesCodec = t.type({
    fw_ver: t.string,
    motor_delay_close: t.number,
    motor_delay_open: t.number,
    reboot_count:	t.number,
    serial_number: t.string,
    system_mode: t.number,
    valve_state: t.number,
    wifi_sta_enc:	t.string,
    wifi_sta_ssid: t.string
});

const InternalDeviceServiceCodec = t.type( {
    createdTime: t.string,
    deviceId: t.string,
    fwProperties: FwPropertiesCodec,
    fwVersion: t.string,
    isConnected: t.boolean,
    lastHeardFromTime: t.string,
    updatedTime:  t.string,
});

type FwProperties = t.TypeOf<typeof FwPropertiesCodec>;
type InternalDeviceService = t.TypeOf<typeof InternalDeviceServiceCodec>;

export {FwProperties, InternalDeviceService, FwPropertiesCodec, InternalDeviceServiceCodec};

