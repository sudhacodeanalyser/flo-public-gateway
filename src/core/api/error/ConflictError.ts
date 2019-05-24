import ExtendableError from './ExtendableError';

export default class ConflictError extends ExtendableError {
  constructor(message: string = 'Conflict.') {
    super(message, 409);
  }
}