import _ from 'lodash';

export interface SetOp {
  key: string,
  value: any
}

export interface RemoveOp {
  key: string
}

export interface AppendOp {
  key: string,
  value: any
}

export interface Patch {
  setOps?: SetOp[],
  removeOps?: RemoveOp[],
  appendOps?: AppendOp[]
}

export function fromPartialRecord<T>(partialRecord: Partial<T>): Patch {
  const setOps = _.map(_.pickBy(partialRecord, value => !_.isUndefined(value)), (value: any, key: string) => ({
    key,
    value
  }));

  return { setOps };
}