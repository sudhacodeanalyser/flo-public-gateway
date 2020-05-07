import ExtendableError from './ExtendableError';

export default class ForbiddenError extends ExtendableError {
  constructor(message: string = 'Gone.') {
    super(message, 410);
  }
}