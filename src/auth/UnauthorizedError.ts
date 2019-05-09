import ExtendableError from '../core/api/error/ExtendableError';

export default class UnauthorizedError extends ExtendableError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}