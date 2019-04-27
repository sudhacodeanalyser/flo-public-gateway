import ExtendableError from '../core/api/error/ExtendableError';

export default class ReqValidationError extends ExtendableError {
  constructor(message: string) {
    super(message);
  }
}