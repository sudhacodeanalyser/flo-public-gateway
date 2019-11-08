import IFTTTError from './IFTTTError';

export default class ActionFieldsError extends IFTTTError {
  constructor(message: string = 'Invalid action fields.') {
    super(message, 400);
  }
}
