import * as t from 'io-ts';
import { $enum } from 'ts-enum-util';
import * as _ from 'lodash';

export function convertEnumtoCodec<T extends Record<Extract<keyof T, string>, string>>(enumType: T): t.KeyofC<{ [k in T[keyof T]]: null }> {
  const values = $enum(enumType).getValues();

  return t.keyof(
    _.zipObject(values, values.map(() => null)) as {
      [k in T[keyof T]]: null
    }
  );
}

export function translateNumericToStringEnum<
  S extends Record<Extract<keyof S, string>, string>,
  N extends Record<Extract<keyof N, string>, number>
>(strEnumType: S, numEnumType: N, value?: number, defaultKey?: Extract<keyof N, string>): S[keyof S] | undefined {
  const strEnumKey = $enum(numEnumType).getKeyOrDefault(value, defaultKey);

  return strEnumKey && 
    (
      $enum(strEnumType).getValueOrDefault(strEnumKey) || 
      undefined
    );
}

export function translateStringToNumericEnum<
  N extends Record<Extract<keyof N, string>, number>,
  S extends Record<Extract<keyof S, string>, string>
>(numEnumType: N, strEnumType: S, value?: string, defaultKey?: Extract<keyof S, string>): N[keyof N] | undefined {
  const numEnumKey = $enum(strEnumType).getKeyOrDefault(value, defaultKey);

  return numEnumKey && 
    (
      $enum(numEnumType).getValueOrDefault(numEnumKey) || 
      undefined
    );
}