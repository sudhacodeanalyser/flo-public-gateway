import * as _ from 'lodash';

export interface SetOp {
  key: string;
  value: any;
  ifNotExists?: boolean;
}

export interface RemoveOp {
  key: string;
}

export interface AppendOp {
  key: string;
  value: any;
}

export interface Patch {
  setOps?: SetOp[];
  removeOps?: RemoveOp[];
  appendOps?: AppendOp[];
}

export function fromPartialRecord<T>(partialRecord: Partial<T>, ifNotExistsProps: string[] = []): Patch {
  const setOps: SetOp[] = _.map(
    _.pickBy(partialRecord, value => !_.isUndefined(value)),
    (value: any, key: string): SetOp => ({
      key,
      value,
      ifNotExists: ifNotExistsProps.indexOf(key) > 0 ? true : undefined
    }));

  return { setOps };
}