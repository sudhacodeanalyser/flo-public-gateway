import IFTTTError from "./IFTTTError";

export default class IFTTTUnauthorizedError extends IFTTTError {
  constructor(message: string = 'Unauthorized.') {
    super(message, 401);
  }
}
