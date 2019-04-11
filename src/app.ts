import 'reflect-metadata';
import Config from './config/config';
import ContainerFactory from './ContainerFactory';
import ServerFactory from './ServerFactory';
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

