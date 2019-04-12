import dotenv from 'dotenv';
import _ from 'lodash';

dotenv.config();

function getDefaults() {
  switch (process.env.NODE_ENV) {
    case 'production':
    case 'development':
    default:
      return {
        port: 3000,
        appName: 'flo-public-gateway-local',
        enforceSSL: false,
        dynamoTablePrefix: 'dev_'
      };
  }
}

const config = {
  appName: process.env.APP_NAME,
  port: process.env.PORT,
  enforceSSL: process.env.enforceSSL
};

export default {
  ...getDefaults(),
  ..._.omitBy(config, value => _.isUndefined(value))
};