import { ContainerModule, interfaces } from 'inversify';
import HttpAgent, { HttpsAgent } from 'agentkeepalive';
import config from '../config/config';
import axios, { AxiosInstance } from 'axios';
import { HttpService, HttpServiceFactory } from './HttpService';
import axiosBetterStacktrace from 'axios-better-stacktrace';

export default new ContainerModule((bind: interfaces.Bind) => {
  const httpAgent = new HttpAgent({
    freeSocketTimeout: Number(config.externalServiceHttpTimeoutMs)
  });
  const httpsAgent = new HttpsAgent({
    freeSocketTimeout: Number(config.externalServiceHttpTimeoutMs)
  });

  bind<HttpAgent>('HttpAgent').toConstantValue(httpAgent);
  bind<HttpsAgent>('HttpsAgent').toConstantValue(httpsAgent);
  const agent = axios.create({
    httpAgent,
    httpsAgent
  })
  bind<AxiosInstance>('HttpClient').toConstantValue(agent);

  axiosBetterStacktrace(agent);
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
