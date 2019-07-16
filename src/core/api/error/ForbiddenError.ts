import ExtendableError from './ExtendableError';

export default class ForbiddenError extends ExtendableError {
  constructor(message: string = 'Forbidden.') {
    super(message, 403);
  }
}