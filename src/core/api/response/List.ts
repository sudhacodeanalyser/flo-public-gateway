import _ from 'lodash';
import { ListItem as ListItemModel, List as ListModel } from '../../api';

export interface MultiListResponse {
  items: ListModel[]
}

export interface ListResponse {
  items: ListItemModel[]
}

export class List {
  public static fromModelToMulti(list: ListModel): MultiListResponse {
    return {
      items: _.map(list, (listItems, listId) => ({
        [listId]: listItems
      }))
    };
  }

  public static fromModel(list: ListModel): ListResponse {
    const listId = Object.keys(list)[0];
    const listItems = (listId && list[listId]) || [];
    
    return {
      items: listItems
    };
  }
}