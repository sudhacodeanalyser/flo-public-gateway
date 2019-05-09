import ExtendableError from '../core/api/error/ExtendableError';

export default class ForbiddenError extends ExtendableError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}