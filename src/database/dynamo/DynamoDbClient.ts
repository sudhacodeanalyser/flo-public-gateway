import _ from 'lodash';
import AWS from 'aws-sdk';
import DatabaseClient, { KeyMap } from '../DatabaseClient';
import ResourceDoesNotExistError from '../../core/api/error/ResourceDoesNotExistError';
import { Patch, AppendOp, SetOp, RemoveOp } from '../Patch';
import { inject, injectable } from 'inversify';

// These are interfaces are internal to this module
interface ExpressionAttributeNameTuple {
  name: string,
  exprName: string
}

interface ExpressionAttributeValueTuple {
  value: any,
  exprValue: string
}

// Constant for update expression construction
const EMPTY_LIST_EXPRESION_ATTRIBUTE_VALUE = `:__empty_list`;

export type DynamoDbQuery = Partial<AWS.DynamoDB.DocumentClient.QueryInput>;

@injectable()
class DynamoDbClient implements DatabaseClient {
  constructor(
   @inject('DynamoDbDocumentClient') public dynamoDb: AWS.DynamoDB.DocumentClient,
   @inject('TablePrefix') public tablePrefix: string
  ) {}

  public async put<T>(tableName: string, item: T): Promise<T> {
    await this._put<T>(tableName, item).promise();

    return item;
  }

  public _put<T>(tableName: string, item: T): AWS.Request<AWS.DynamoDB.DocumentClient.PutItemOutput, AWS.AWSError> {
    return this.dynamoDb.put({
      TableName: this.tablePrefix + tableName,
      Item: item,
      ReturnValues: 'NONE' // PutItem does not recognize any values other than NONE or ALL_OLD
    });
  }

  public _get<T>(tableName: string, key: KeyMap): AWS.Request<AWS.DynamoDB.DocumentClient.GetItemOutput, AWS.AWSError> {
    return this.dynamoDb.get({
      TableName: this.tablePrefix + tableName,
      Key: key
    });
  }

  public async get<T>(tableName: string, key: KeyMap): Promise<T | null> {
    const { Item } = await this._get<T>(tableName, key).promise();

    return _.isEmpty(Item) ? null : Item as T;
  }

  public _update<T>(tableName: string, key: KeyMap, patch: Patch, flattenNestedProps: boolean = true): AWS.Request<AWS.DynamoDB.DocumentClient.UpdateItemOutput, AWS.AWSError> {
    const {
      UpdateExpression,
      ExpressionAttributeNames: updateExprNames,
      ExpressionAttributeValues,
    } = this.createUpdate(patch, flattenNestedProps);
    const {
      ConditionExpression,
      ExpressionAttributeNames: conditionExprNames
    } = this.createCondition(key);

    return this.dynamoDb.update({
      TableName: this.tablePrefix + tableName,
      Key: key,
      UpdateExpression,
      ConditionExpression,
      ExpressionAttributeNames: {
        ...updateExprNames,
        ...conditionExprNames
      },
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
  }

  public async update<T>(tableName: string, key: KeyMap, patch: Patch, flattenNestedProps: boolean = true): Promise<T> {
    try {
      if (_.isEmpty(patch) || (_.isEmpty(patch.setOps) && _.isEmpty(patch.appendOps) && _.isEmpty(patch.removeOps))) {
        throw new Error('Cannot apply an empty patch');
      }

      const { Attributes } = await this._update<T>(tableName, key, patch, flattenNestedProps).promise();

      return Attributes as T;
    } catch (err) {
      // There's no type defined for this, so we check the name string
      if (err.name === 'ConditionalCheckFailedException') {
        throw new ResourceDoesNotExistError();
      } else if (err.name === 'ValidationException' && flattenNestedProps) {
        // This exception likely due to a nested object not existing on the record. 
        // Therefore we will try once more without flattening the nested properties in order to 
        // upsert the nested object.
        return this.update(tableName, key, patch, false);
      } else {
        throw err;
      }
    }
  }

  public _remove(tableName: string, key: KeyMap): AWS.Request<AWS.DynamoDB.DocumentClient.DeleteItemOutput, AWS.AWSError> {

    return this.dynamoDb.delete({
      TableName: this.tablePrefix + tableName,
      Key: key,
      ReturnValues:'ALL_OLD'
    });
  }

  public async remove(tableName: string, key: KeyMap): Promise<void> {
    const { Attributes } = await this._remove(tableName, key).promise();

    if (_.isEmpty(Attributes)) {
      throw new ResourceDoesNotExistError();
    } 
  }

  public _query(tableName: string, queryOptions: DynamoDbQuery): AWS.Request<AWS.DynamoDB.DocumentClient.QueryOutput, AWS.AWSError> {

    return this.dynamoDb.query({
      TableName: this.tablePrefix + tableName,
      ...queryOptions
    });
  }

  public async query<T>(tableName: string, queryOptions: DynamoDbQuery): Promise<T[]> {
    const { Items } = await this._query(tableName, queryOptions).promise();

    return Items as T[];
  }

  private createCondition(key: KeyMap): Partial<AWS.DynamoDB.DocumentClient.UpdateItemInput> {
    const condTuples = _.map(key, (value, name) => ({
      name,
      exprName: `#${ name }`
    }));
    const ConditionExpression = condTuples
      .map(({ exprName }) => `attribute_exists(${ exprName })`)
      .join(' AND ');
    const ExpressionAttributeNames = this.collectExpressionAttributeNames(condTuples);

    return {
      ConditionExpression,
      ExpressionAttributeNames
    };
  }

  private createUpdate(patch: Patch, flattenNestedProps: boolean = true): Partial<AWS.DynamoDB.DocumentClient.UpdateItemInput> {
    const setUpdate = this.processSetOps(patch, flattenNestedProps);
    const nestedSetUpdate = this.processNestedSetOps(patch, flattenNestedProps);
    const appendUpdate = this.processAppendOps(patch);
    const removeUpdate = this.processRemoveOps(patch);
    const setExpr = setUpdate.opStrs.length || nestedSetUpdate.opStrs.length || appendUpdate.opStrs.length ?
      `SET ${ [...setUpdate.opStrs, ...nestedSetUpdate.opStrs, ...appendUpdate.opStrs].join(', ') }` :
      '';
    const removeExpr = removeUpdate.opStrs.length ?
      `REMOVE ${ removeUpdate.opStrs.join(', ') }` :
      '';
    const UpdateExpression = [setExpr, removeExpr].filter(expr => !_.isEmpty(expr)).join(', ');
    const ExpressionAttributeNames =
      [
        setUpdate,
        nestedSetUpdate,
        appendUpdate,
        removeUpdate
      ].reduce((acc, { ExpressionAttributeNames: exprNames }) => ({
        ...acc,
        ...exprNames
      }), {});
    const ExpressionAttributeValues =
      [
        setUpdate,
        nestedSetUpdate,
        appendUpdate,
        removeUpdate
      ].reduce((acc, { ExpressionAttributeValues: exprValues }) => ({
        ...acc,
        ...exprValues
      }), {});

    return {
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    };
  }

  private collectExpressionAttributeNames(exprTuples: ExpressionAttributeNameTuple[]): AWS.DynamoDB.DocumentClient.UpdateItemInput['ExpressionAttributeNames'] {
    return exprTuples.reduce((acc, { exprName, name }) => ({
      ...acc,
      [exprName]: name
    }), {});
  }

  private collectExpressionAttributeValues(exprTuples: ExpressionAttributeValueTuple[]): AWS.DynamoDB.DocumentClient.UpdateItemInput['ExpressionAttributeValues'] {
    return exprTuples.reduce((acc, { exprValue, value }) => ({
      ...acc,
      [exprValue]: value
    }), {});
  }

  private processSetOps(patch: Patch, flattenNestedProps: boolean = true): { opStrs: string[] } & Partial<AWS.DynamoDB.DocumentClient.UpdateItemInput> {
    const setOps: SetOp[] | undefined = patch.setOps && patch.setOps
      .filter(({ value }) => !flattenNestedProps || (_.isArray(value) || !_.isObject(value)));
    const setExprTuples = setOps === undefined ? [] :
      setOps.map(setOp => ({
        name: setOp.key,
        exprName: `#${ setOp.key }`,
        value: setOp.value,
        exprValue: `:${ setOp.key }`
      }));
    const setStrs = setExprTuples
      .map(({ exprName, exprValue }) => `${ exprName } = ${ exprValue }`);

    return {
      ExpressionAttributeNames: this.collectExpressionAttributeNames(setExprTuples),
      ExpressionAttributeValues: this.collectExpressionAttributeValues(setExprTuples),
      opStrs: setStrs
    };
  }

  // Only handles single level of nesting
  private processNestedSetOps(patch: Patch, flattenNestedProps: boolean = true): { opStrs: string[] } & Partial<AWS.DynamoDB.DocumentClient.UpdateItemInput> {
    const setOps = patch.setOps && patch.setOps
      .filter(({ value }) =>  flattenNestedProps && !_.isArray(value) && _.isObject(value));
    const setExprTuples = setOps === undefined ? [] :
      _.flatMap(setOps, setOp => 
        Object.keys(setOp.value)
          .filter(nestedKey => setOp.value[nestedKey] !== undefined)
          .map(nestedKey => ({
            name: nestedKey,
            exprName: `#${ setOp.key }.#${ nestedKey }`,
            value: setOp.value[nestedKey],
            exprValue: `:${ nestedKey }`
          }))
      );
      const setStrs = setExprTuples.map(({ exprName, exprValue }) =>
        `${ exprName } = ${ exprValue }`
      );
      const ExpressionAttributeNames = this.collectExpressionAttributeNames(
        setExprTuples.map(({ exprName, ...rest }) => ({
          ...rest,
          exprName: _.last(exprName.split('.')) || exprName
        }))
      );
      const ExpressionAttributeValues = this.collectExpressionAttributeValues(
        setExprTuples
      );
      const topLevelNames = setOps && setOps.reduce(
        (acc, { key }) => ({ ...acc, [`#${ key }`]: key }),
        {}
      );

      return {
        ExpressionAttributeNames: {
          ...ExpressionAttributeNames,
          ...topLevelNames
        },
        ExpressionAttributeValues,
        opStrs: setStrs
      };
  }

  private processRemoveOps(patch: Patch): { opStrs: string[] } & Partial<AWS.DynamoDB.DocumentClient.UpdateItemInput> {
    const removeOps: RemoveOp[] | undefined = patch.removeOps;
    const removeExprTuples = removeOps === undefined ? [] :
      removeOps.map(removeOp => ({
        name: removeOp.key,
        exprName: `#${ removeOp.key }`
      }));
    const removeStrs = removeExprTuples
      .map(({ exprName }) => exprName)

    return {
      ExpressionAttributeNames: this.collectExpressionAttributeNames(removeExprTuples),
      ExpressionAttributeValues: {},
      opStrs: removeStrs
    };
  }

  private processAppendOps(patch: Patch): { opStrs: string[] } & Partial<AWS.DynamoDB.DocumentClient.UpdateItemInput> {
    const appendOps: AppendOp[] | undefined = patch.appendOps;
    const appendExprTuples = appendOps === undefined ? [] :
      appendOps.map(appendOp => ({
        name: appendOp.key,
        exprName: `#${ appendOp.key }`,
        value: appendOp.value,
        exprValue: `:${ appendOp.key }`
      }));
    const appendStrs = appendExprTuples
      .map(({ exprName, exprValue }) => `${ exprName } = list_append(if_not_exists(${ exprName }, ${ EMPTY_LIST_EXPRESION_ATTRIBUTE_VALUE }), ${ exprValue }))`);

    return {
      ExpressionAttributeNames: this.collectExpressionAttributeNames(appendExprTuples),
      ExpressionAttributeValues: {
        ...this.collectExpressionAttributeValues(appendExprTuples),
        ...( appendExprTuples.length ?
            { [EMPTY_LIST_EXPRESION_ATTRIBUTE_VALUE]: [] } :
            {}
        )
      },
      opStrs: appendStrs
    };
  }
}

export default DynamoDbClient;