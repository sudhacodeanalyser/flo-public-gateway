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
        authUrl: 'https://api-dev.flocloud.co/api/v1/accesscontrol/authorize',
        internalDeviceServiceBaseUrl: 'https://flo-device-service.flocloud.co/v1',
        apiV1Url: 'https://api-dev.flocloud.co/api/v1',
        defaultUserLocale: 'en-US',
        localizationApiUrl: 'https://flo-localization-service-dev.flocloud.co/v1'
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
  presenceKafkaTopic: 'presence-activity-v1', // Should not change across environments
  internalDeviceServiceBaseUrl: process.env.INTERNAL_DEVICE_SERVICE_BASE_URL,
  apiV1Url: process.env.API_V1_URL,
  docsEndpointUser: process.env.DOCS_ENDPOINT_USER,
  docsEndpointPassword: process.env.DOCS_ENDPOINT_PASSWORD,
  postgresUser: process.env.POSTGRES_USER,
  postgresHost: process.env.POSTGRES_HOST,
  postgresPassword: process.env.POSTGRES_PASSWORD,
  postgresDatabase: process.env.POSTGRES_DATABASE,
  postgresPort: process.env.POSTGRES_PORT,
  defaultUserLocale: process.env.DEFAULT_USER_LOCALE,
  localizationApiUrl: process.env.LOCALIZATION_API_URL,
};

export default {
  ...getDefaults(),
  ..._.pickBy(config, value => !_.isUndefined(value))
};