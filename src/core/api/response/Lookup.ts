import * as _ from 'lodash';
import { LookupItem as LookupItemModel, Lookup as LookupModel } from '../../api';

export interface MultiLookupResponse {
  items: LookupModel[]
}

export interface LookupResponse {
  items: LookupItemModel[]
}

export class Lookup {
  public static fromModelToMulti(lookup: LookupModel): MultiLookupResponse {
    return {
      items: _.map(lookup, (lookupItems, listId) => ({
        [listId]: lookupItems
      }))
    };
  }

  public static fromModel(lookup: LookupModel): LookupResponse {
    const listId = Object.keys(lookup)[0];
    const lookupItems = (listId && lookup[listId]) || [];
    
    return {
      items: lookupItems
    };
  }
}