import ExtendableError from '../core/api/error/ExtendableError';

export default class ApiV1Error extends ExtendableError {
  
  constructor(statusCode: number, message: string) {
    super(message, statusCode);
  }
}
