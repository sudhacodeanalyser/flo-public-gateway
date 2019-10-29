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
        aclUrl: 'https://api-dev.flocloud.co/api/v1/accesscontrol/refresh',
        internalDeviceServiceBaseUrl: 'https://flo-device-service.flocloud.co/v1',
        apiV1Url: 'https://api-dev.flocloud.co/api/v1',
        defaultUserLocale: 'en-US',
        localizationApiUrl: 'https://flo-localization-service-dev.flocloud.co/v1',
        notificationApiUrl: 'https://flo-notification-api.flocloud.co',
        healthTestServiceUrl: 'http://flo-device-manager-dev.flocloud.co',
        influxPort: 8086,
        influxHost: 'mcfly-da662558.influxcloud.net',
        influxUsername: 'flo_api_dev',
        influxAnalyticsDb: 'telemetry_analytics_dev',
        influxHourlyMeasurement: 'telemetry_hourly',
        influxTelemetryDb: 'telemetry_dev',
        influxSecondMeasurement: '"twelve_weeks".telemetry_raw',
        externalServiceHttpTimeoutMs: 10000,
        entityActivityKafkaTopic: 'entity-activity-v1',
        telemetryKafkaTopic: 'telemetry-v3',
        puckTelemetryKafkaTopic: 'telemetry-puck-v1',
        redisHost: 'redis-dev-cluster.9alsts.clustercfg.usw2.cache.amazonaws.com',
        redisPort: '6379',
        presenceServiceUrl: 'https://flo-core-service-dev.flocloud.co/presence',
        telemetryTagsServiceUrl: 'https://flo-telemetry-tags.flocloud.co',
        waterMeterUrl: 'https://flo-water-meter.flosecurecloud.com',
        apiV1IFTTTTestSetupUrl: 'https://api-dev.flocloud.co/api/v1/ifttt/v1/test/setup',
        iftttRealtimeNotificationsUrl: 'https://realtime.ifttt.com/v1/notifications'
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
  aclUrl: process.env.ACL_URL,
  kafkaHost: process.env.KAFKA_HOST,
  kafkaTimeout: process.env.KAFKA_TIMEOUT_MS,
  internalDeviceServiceBaseUrl: process.env.INTERNAL_DEVICE_SERVICE_BASE_URL,
  apiV1Url: process.env.API_V1_URL,
  docsEndpointUser: process.env.DOCS_ENDPOINT_USER,
  docsEndpointPassword: process.env.DOCS_ENDPOINT_PASSWORD,
  externalDocsEndpointUser: process.env.EXTERNAL_DOCS_ENDPOINT_USER,
  externalDocsEndpointPassword: process.env.EXTERNAL_DOCS_ENDPOINT_PASSWORD,
  postgresUser: process.env.POSTGRES_USER,
  postgresHost: process.env.POSTGRES_HOST,
  postgresPassword: process.env.POSTGRES_PASSWORD,
  postgresDatabase: process.env.POSTGRES_DATABASE,
  postgresPort: process.env.POSTGRES_PORT,
  defaultUserLocale: process.env.DEFAULT_USER_LOCALE,
  localizationApiUrl: process.env.LOCALIZATION_API_URL,
  notificationApiUrl: process.env.NOTIFICATION_API_URL,
  healthTestServiceUrl: process.env.HEALTH_TEST_SERVICE_URL,
  influxHost: process.env.INFLUX_HOST,
  influxPort: process.env.INFLUX_PORT,
  influxUsername: process.env.INFLUX_USERNAME,
  influxPassword: process.env.INFLUX_PASSWORD,
  influxAnalyticsDb: process.env.INFLUX_ANALYTICS_DB,
  influxHourlyMeasurement: process.env.INFLUX_HOURLY_MEASUREMENT,
  influxTelemetryDb: process.env.INFLUX_TELEMETRY_DB,
  influxSecondMeasurement: process.env.INFLUX_SECOND_MEASUREMNT,
  externalServiceHttpTimeoutMs: process.env.EXTERNAL_SERVICE_HTTP_TIMEOUT_MS,
  entityActivityKafkaTopic: process.env.ENTITY_ACTIVITY_KAFKA_TOPIC,
  telemetryKafkaTopic: process.env.TELEMETRY_KAFKA_TOPIC,
  puckTelemetryKafkaTopic: process.env.PUCK_TELEMETRY_KAFKA_TOPIC,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,
  presenceServiceUrl: process.env.PRESENCE_SERVICE_URL,
  telemetryTagsServiceUrl: process.env.TELEMETRY_TAGS_SERVICE_URL,
  waterMeterUrl: process.env.WATER_METER_SERVICE_URL,
  iftttServiceKey: process.env.IFTTT_SERVICE_KEY,
  apiV1IFTTTTestSetupUrl: process.env.API_V1_IFTTT_TEST_SETUP_URL,
  iftttRealtimeNotificationsUrl: process.env.IFTTT_REALTIME_NOTIFICATIONS_URL,
};

export default {
  ...getDefaults(),
  ..._.pickBy(config, value => !_.isUndefined(value))
};