import ConflictError from './ConflictError';

export default class ResourceDoesNotExistError extends ConflictError {
  constructor(message: string = 'Resource does not exist.') {
    super(message);
  }
}