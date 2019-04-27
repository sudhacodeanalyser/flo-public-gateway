import ExtendableError from './ExtendableError';

export default class ResourceNotDeletableError extends ExtendableError {
  constructor(message: string = 'Cannot delete Resource.') {
    super(message, 400);
  }
}