import _ from 'lodash';

export function parseExpand(expand?: string) {
  return (expand === undefined ? '' : expand).split(',').filter(prop => !_.isEmpty(prop))
}