import IFTTTError from './IFTTTError';

export default class TriggerFieldsError extends IFTTTError {
  constructor(message: string = 'Invalid trigger fields.') {
    super(message, 400);
  }
}
