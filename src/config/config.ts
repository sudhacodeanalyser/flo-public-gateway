import dotenv from 'dotenv';
import _ from 'lodash';

dotenv.config();

function getDefaults(): { [key: string]: any } {
  switch (process.env.NODE_ENV) {
    case 'production':
    case 'development':
    default:
      return {
        port: 3000,
        appName: 'flo-public-gateway',
        enforceSSL: false,
        dynamoTablePrefix: 'dev_',
        apiVersion: 2,
        authUrl: 'https://api-dev.flocloud.co/api/v1/accesscontrol/authorize'
      };
  }
}

const config = {
  env: process.env.NODE_ENV,
  appName: process.env.APP_NAME,
  port: process.env.PORT,
  enforceSSL: process.env.enforceSSL,
  dynamoTablePrefix: process.env.DYNAMO_TABLE_PREFIX,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  apiVersion: process.env.API_VERSION,
  authUrl: process.env.AUTH_URL,
  kafkaHost: process.env.KAFKA_HOST,
  kafkaTimeout: process.env.KAFKA_TIMEOUT_MS,
  presenceKafkaTopic: 'presence-activity-v1' // Should not change across environments
};

export default {
  ...getDefaults(),
  ..._.pickBy(config, value => !_.isUndefined(value))
};