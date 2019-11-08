import ExtendableError from '../../../core/api/error/ExtendableError';

export default class IFTTTError extends ExtendableError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode, {
      errors: [{ message }]
    });
  }
}
