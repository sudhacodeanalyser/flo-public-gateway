import { injectable, inject } from "inversify";
import express from 'express';
import AuthMiddlewareFactory from '../../auth/AuthMiddlewareFactory';
import Request from '../../core/api/Request';
import IFTTTUnauthorizedError from "./error/IFTTTUnauthorizedError";

type Params = { [param: string]: any };
type GetParams = (req: Request) => Promise<Params>;

@injectable()
class IFTTTAuthMiddlewareFactory {
  @inject('AuthMiddlewareFactory') private authMiddlewareFactory: AuthMiddlewareFactory;

  public create(getParams?: GetParams, overrideMethodId?: string): express.Handler {
    const handler = this.authMiddlewareFactory.create(getParams, overrideMethodId);

    return async (req: Request, res: express.Response, next: express.NextFunction): Promise<void> => {
      const customNext: express.NextFunction = (err?) => {
        if (err) {
          next(new IFTTTUnauthorizedError(err.message));
        } else {
          next();
        }
      }
      handler(req, res, customNext);
    }
  }
}

export default IFTTTAuthMiddlewareFactory;
