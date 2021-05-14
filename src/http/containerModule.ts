import { ContainerModule, interfaces } from 'inversify';
import HttpAgent, { HttpsAgent } from 'agentkeepalive';
import config from '../config/config';
import axios, { AxiosInstance } from 'axios';
import { HttpService, HttpServiceFactory } from './HttpService';

export default new ContainerModule((bind: interfaces.Bind) => {
  const httpAgent = new HttpAgent({
    freeSocketTimeout: config.externalServiceHttpTimeoutMs
  });
  const httpsAgent = new HttpsAgent({
    freeSocketTimeout: config.externalServiceHttpTimeoutMs
  });

  bind<HttpAgent>('HttpAgent').toConstantValue(httpAgent);
  bind<HttpsAgent>('HttpsAgent').toConstantValue(httpsAgent);
  bind<AxiosInstance>('HttpClient').toConstantValue(axios.create({
    httpAgent,
    httpsAgent
  }));
  bind<HttpService>('HttpService').to(HttpService);
  bind<HttpServiceFactory>('HttpServiceFactory').toFactory((context: interfaces.Context) => {
    return (baseUrl?: string, authToken?: string) => {
      const httpService = context.container.get<HttpService>('HttpService');

      httpService.baseUrl = baseUrl;
      httpService.authToken = authToken;

      return httpService;
    };
  })
});
