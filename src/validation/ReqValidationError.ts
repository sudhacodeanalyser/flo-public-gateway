import ExtendableError from '../core/api/error/ExtendableError';

export default class ReqValidationError extends ExtendableError {
  constructor(message: string, invalidProperties?: any[]) {
    super(message, 400, invalidProperties && { invalidProperties });
  }
}