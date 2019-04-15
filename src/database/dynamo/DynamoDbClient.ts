import _ from 'lodash';
import AWS from 'aws-sdk';
import DatabaseClient, { Patch, KeyMap, AppendOp, SetOp, RemoveOp } from '../DatabaseClient';
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
    const { Attributes } = await this._put<T>(tableName, item);

    return Attributes as T;
  }

  public _put<T>(tableName: string, item: T) {
    return this.dynamoDb.put({
      TableName: this.tablePrefix + tableName,
      Item: item,
      ReturnValues: 'ALL_NEW'
    })
    .promise();
  }

  public _get<T>(tableName: string, key: KeyMap) {
    return this.dynamoDb.get({
      TableName: this.tablePrefix + tableName,
      Key: key
    })
    .promise();
  }

  public async get<T>(tableName: string, key: KeyMap): Promise<T | null> {
    const { Item } = await this._get<T>(tableName, key);

    return _.isEmpty(Item) ? null : Item as T;
  }

  public _update<T>(tableName: string, key: KeyMap, patch: Patch) {
    const {
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    } = this.createUpdate(patch);

    return this.dynamoDb.update({
      TableName: this.tablePrefix + tableName,
      Key: key,
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: 'ALL_NEw'
    })
    .promise();
  }

  public async update<T>(tableName: string, key: KeyMap, patch: Patch): Promise<T> {
    const { Attributes } = await this._update<T>(tableName, key, patch);

    return Attributes as T;
  }

  public _remove(tableName: string, key: KeyMap) {
    return this.dynamoDb.get({
      TableName: this.tablePrefix + tableName,
      Key: key
    })
    .promise();
  }

  public async remove(tableName: string, key: KeyMap): Promise<void> {
    await this._remove(tableName, key);
  }

  public async _query(tableName: string, queryOptions: DynamoDbQuery) {

    return this.dynamoDb.query({
      TableName: this.tablePrefix + tableName,
      ...queryOptions
    })
    .promise();
  }

  public async query<T>(tableName: string, queryOptions: DynamoDbQuery): Promise<T[]> {
    const { Items } = await this._query(tableName, queryOptions);

    return Items as T[];
  }

  private createUpdate(patch: Patch) {
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

  private collectExpressionAttributeNames(exprTuples: ExpressionAttributeNameTuple[]) {
    return exprTuples.reduce((acc, { exprName, name }) => ({
      ...acc,
      [exprName]: name
    }), {});
  }

  private collectExpressionAttributeValues(exprTuples: ExpressionAttributeValueTuple[]) {
    return exprTuples.reduce((acc, { exprValue, value }) => ({
      ...acc,
      [exprValue]: value
    }), {});
  }

  private processSetOps(patch: Patch) {
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

  private processRemoveOps(patch: Patch) {
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

  private processAppendOps(patch: Patch) {
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
        [EMPTY_LIST_EXPRESION_ATTRIBUTE_VALUE]: []
      },
      opStrs: appendStrs
    };
  }
}

export default DynamoDbClient;