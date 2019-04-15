import ExtendableError from '../core/api/ExtendableError';

export default class ReqValidationError extends ExtendableError {  
  constructor(report: string) {
    super(report);
  }
}