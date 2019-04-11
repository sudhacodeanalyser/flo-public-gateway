import 'reflect-metadata';
import Config from './config/config';
import ContainerFactory from './container/ContainerFactory';
import ServerFactory from './server/ServerFactory';
import Logger from 'bunyan';
import './core/controllers';

const container = ContainerFactory();
const server = ServerFactory(container);

const app = server.build();
const logger = container.get<Logger>('Logger');
const config = container.get<typeof Config>('Config');

app.listen(config.port, () => {
  logger.info('Started', { port: config.port });
});

