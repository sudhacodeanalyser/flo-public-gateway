import ExtendableError from '../core/api/error/ExtendableError';

export default class ReqValidationError extends ExtendableError {
  constructor(report: string) {
    super(report);
  }
}