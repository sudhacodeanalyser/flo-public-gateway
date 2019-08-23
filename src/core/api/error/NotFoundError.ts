import ExtendableError from './ExtendableError';

export default class NotFoundError extends ExtendableError {
  constructor(message: string = 'Not found.') {
    super(message, 404);
  }
}