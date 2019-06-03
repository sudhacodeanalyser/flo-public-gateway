import * as t from 'io-ts';
import { convertEnumtoCodec } from './enumUtils';

export namespace NoYesUnsure {
  export enum Numeric {
    NO = 0,
    YES,
    UNSURE
  }

  export enum String {
    NO = 'no',
    YES = 'yes',
    UNSURE = 'unsure'
  }

  export const Codec = convertEnumtoCodec(String);
}