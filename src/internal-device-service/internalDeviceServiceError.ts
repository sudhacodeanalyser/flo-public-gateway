import ExtendableError from "../core/api/error/ExtendableError";

export default class InternalDeviceServiceError extends ExtendableError {
  constructor(statusCode: number, message: string) {
    super(message, statusCode);
  }
}
