import _ from 'lodash';
import AWS from 'aws-sdk';
import DatabaseClient, { KeyMap } from '../DatabaseClient';
import ResourceDoesNotExistError from '../../core/api/ResourceDoesNotExistError';
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
    const { Attributes } = await this._put<T>(tableName, item).promise();

    return Attributes as T;
  }

  public _put<T>(tableName: string, item: T): AWS.Request<AWS.DynamoDB.DocumentClient.PutItemOutput, AWS.AWSError> {
    return this.dynamoDb.put({
      TableName: this.tablePrefix + tableName,
      Item: item,
      ReturnValues: 'ALL_NEW'
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

  public _update<T>(tableName: string, key: KeyMap, patch: Patch): AWS.Request<AWS.DynamoDB.DocumentClient.UpdateItemOutput, AWS.AWSError> {
    const {
      UpdateExpression,
      ExpressionAttributeNames: updateExprNames,
      ExpressionAttributeValues
    } = this.createUpdate(patch);
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

  public async update<T>(tableName: string, key: KeyMap, patch: Patch): Promise<T> {
    try {
      if (_.isEmpty(patch) || (_.isEmpty(patch.setOps) && _.isEmpty(patch.appendOps) && _.isEmpty(patch.removeOps))) {
        throw new Error('Cannot apply an empty patch');
      }

      const { Attributes } = await this._update<T>(tableName, key, patch).promise();

      return Attributes as T;
    } catch (err) {
      // There's no type defined for this, so we check the name string
      if (err.name === 'ConditionalCheckFailedException') {
        throw new ResourceDoesNotExistError();
      } else {
        throw err;
      }
    }
  }

  public _remove(tableName: string, key: KeyMap): AWS.Request<AWS.DynamoDB.DocumentClient.DeleteItemOutput, AWS.AWSError> {
    return this.dynamoDb.delete({
      TableName: this.tablePrefix + tableName,
      Key: key
    });
  }

  public async remove(tableName: string, key: KeyMap): Promise<void> {
    await this._remove(tableName, key).promise();
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

  private createUpdate(patch: Patch): Partial<AWS.DynamoDB.DocumentClient.UpdateItemInput> {
    const setUpdate = this.processSetOps(patch);
    const appendUpdate = this.processAppendOps(patch);
    const removeUpdate = this.processRemoveOps(patch);
    const setExpr = setUpdate.opStrs.length || appendUpdate.opStrs.length ?
      `SET ${ [...setUpdate.opStrs, ...appendUpdate.opStrs].join(', ') }` :
      '';
    const removeExpr = removeUpdate.opStrs.length ?
      `REMOVE ${ removeUpdate.opStrs.join(', ') }` :
      '';
    const UpdateExpression = [setExpr, removeExpr].filter(expr => !_.isEmpty(expr)).join(', ');
    const ExpressionAttributeNames =
      [
        setUpdate,
        appendUpdate,
        removeUpdate
      ].reduce((acc, { ExpressionAttributeNames: exprNames }) => ({
        ...acc,
        ...exprNames
      }), {});
    const ExpressionAttributeValues =
      [
        setUpdate,
        appendUpdate,
        removeUpdate
      ].reduce((acc, { ExpressionAttributeValues: exprValues }) => ({
        ...acc,
        ...exprValues
      }), {});

    return {
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
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

  private processSetOps(patch: Patch): { opStrs: string[] } & Partial<AWS.DynamoDB.DocumentClient.UpdateItemInput> {
    const setOps: SetOp[] | undefined = patch.setOps;
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