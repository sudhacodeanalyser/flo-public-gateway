export default class ExtendableError extends Error {
  constructor(
    message?: string, 
    public statusCode: number = 400, 
    public data: { [prop: string]: any } = {}
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.data = data;
  }
}