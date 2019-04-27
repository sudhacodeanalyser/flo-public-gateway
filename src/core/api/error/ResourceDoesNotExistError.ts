import ExtendableError from './ExtendableError';

export default class ResourceDoesNotExistError extends ExtendableError {
  constructor(message: string = 'Resource does not exist.') {
    super(message, 409);
  }
}