import express from 'express';
import { Container, inject } from 'inversify';
import { METADATA_KEY } from 'inversify-express-utils';

export const SymbolFor = {
  InjectableHttpContext: Symbol.for("InjectableHttpContext"),
};

/** 
 * Decorator to inject the inversify-express-utils HttpContext because the 
 * injectHttpContext one only works with Controllers.
 */
export const injectableHttpContext = inject(SymbolFor.InjectableHttpContext)

/** 
 * Helper for NON-controller classes like "@injectable" that may need the current HttpContext.
 * @description 'inversify-express-utils' injectHttpContext only works with controllers.
 * Here is a link to a fork which tried to explain and address the issue:
 * https://github.com/weefsell/inversify-express/releases/tag/0.0.9
 * This utility is dependent on the inversify-express-utils InversifyExpressServer to function properly.
 */
export class InjectableHttpContextUtils {

  public static register(container: Container) : Container {
    if (!container.isBound(SymbolFor.InjectableHttpContext)) {
      // If you are getting this error: "No matching bindings found for serviceIdentifier: InjectableHttpContext"
      // It is because some dependent classes are being created before this attach method is being called.
      // You need to bind the `InjectableHttpContext` before those dependent classes are bound
      container.bind<any>(SymbolFor.InjectableHttpContext).toConstantValue({});
    }
    return container;
  }

  /** Method to attach to the express app so that all routes are automatically registered. */
  public static attach(app: express.Application, container: Container) : express.Application {
    // Ensure empty object for holding the context
    InjectableHttpContextUtils.register(container);

    app.all("*", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const httpContext = Reflect.getMetadata(METADATA_KEY.httpContext, req);
      if (httpContext?.container) {
        // Map the 'inversify-express-util' context to the injectable http context
        const ctx = httpContext.container.get(SymbolFor.InjectableHttpContext);
        ctx.container = httpContext.container;
        ctx.request = httpContext.request;
        ctx.response = httpContext.request;
        ctx.user = httpContext.user;
      }
      next();
    });

    return app;
  }

}
