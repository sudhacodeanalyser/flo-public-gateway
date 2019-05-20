import ExtendableError from './ExtendableError';

export default class ValidationError extends ExtendableError {
  constructor(message: string = 'Validation Error.') {
    super(message, 400);
  }
}