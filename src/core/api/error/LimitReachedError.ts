import ExtendableError from './ExtendableError';

export default class LimitReachedError extends ExtendableError {
  constructor(message: string = 'Limit Reached.') {
    super(message, 429);
  }
}