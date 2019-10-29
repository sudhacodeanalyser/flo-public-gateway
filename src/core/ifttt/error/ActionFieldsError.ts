import ExtendableError from '../../../core/api/error/ExtendableError';

export default class ActionFieldsError extends ExtendableError {
  constructor(message: string = 'Invalid Fields.') {
    super(message, 400);
  }
}