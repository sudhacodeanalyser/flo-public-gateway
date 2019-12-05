// tslint:disable-next-line:no-var-requires
require('@instana/collector')();

import 'reflect-metadata';
import Config from './config/config';
import ContainerFactory from './container/ContainerFactory';
import ServerFactory from './server/ServerFactory';
import Logger from 'bunyan';
import ControllerFactory from './core/ControllerFactory';
import * as cluster from 'cluster';
import * as os from 'os';

const numWorkers = Config.numWorkers || os.cpus().length || 1;

if (cluster.isMaster) {

  for (let i = 0; i < numWorkers; i++) {
    forkWorker();
  }

} else {

  const container = ContainerFactory();
  const server = ServerFactory(container);
  const config = container.get<typeof Config>('Config');

  ControllerFactory(container, config.apiVersion);

  const app = server.build();
  const logger = container.get<Logger>('Logger');

  app.listen(config.port, () => {
    logger.info('Started', { port: config.port });
  });

}

function forkWorker(): cluster.Worker {
  const worker = cluster.fork();

  worker.on('exit', () => {
    forkWorker();
  });

  return worker;
}