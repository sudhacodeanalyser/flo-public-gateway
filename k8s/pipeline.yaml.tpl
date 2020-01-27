image:
  tag: "${CI_PIPELINE_ID}"
secrets:
  datas:
    APPLICATION_NAME: "${APPLICATION_NAME}"
    ENVIRONMENT: "${ENV}"
    ACL_URL: "${ACL_URL}"
    API_V1_URL: "${API_V1_URL}"
    AUTH_URL: "${AUTH_URL}"
    DOCS_ENDPOINT_PASSWORD: "${DOCS_ENDPOINT_PASSWORD}"
    DOCS_ENDPOINT_USER: "${DOCS_ENDPOINT_USER}"
    DYNAMO_TABLE_PREFIX: "${DYNAMO_TABLE_PREFIX}"
    EXTERNAL_DOCS_ENDPOINT_PASSWORD: "${EXTERNAL_DOCS_ENDPOINT_PASSWORD}"
    EXTERNAL_DOCS_ENDPOINT_USER: "${EXTERNAL_DOCS_ENDPOINT_USER}"
    EXTERNAL_SERVICE_HTTP_TIMEOUT_MS: "${EXTERNAL_SERVICE_HTTP_TIMEOUT_MS}"
    HEALTH_TEST_SERVICE_URL: "${HEALTH_TEST_SERVICE_URL}"
    INFLUX_ANALYTICS_DB: "${INFLUX_ANALYTICS_DB}"
    INFLUX_HOST: "${INFLUX_HOST}"
    INFLUX_HOURLY_MEASUREMENT: "${INFLUX_HOURLY_MEASUREMENT}"
    INFLUX_PASSWORD: "${INFLUX_PASSWORD}"
    INFLUX_PORT: "${INFLUX_PORT}"
    INFLUX_SECOND_MEASUREMNT: '${INFLUX_SECOND_MEASUREMNT}'
    INFLUX_TELEMETRY_DB: "${INFLUX_TELEMETRY_DB}"
    INFLUX_USERNAME: "${INFLUX_USERNAME}"
    INTERNAL_DEVICE_SERVICE_BASE_URL: "${INTERNAL_DEVICE_SERVICE_BASE_URL}"
    KAFKA_HOST: "${KAFKA_HOST}"
    KAFKA_TIMEOUT_MS: "${KAFKA_TIMEOUT_MS}"
    LOCALIZATION_API_URL: "${LOCALIZATION_API_URL}"
    NOTIFICATION_API_URL: "${NOTIFICATION_API_URL}"
    POSTGRES_DATABASE: "${POSTGRES_DATABASE}"
    POSTGRES_HOST: "${POSTGRES_HOST}"
    POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
    POSTGRES_PORT: "${POSTGRES_PORT}"
    POSTGRES_USER: "${POSTGRES_USER}"
    PRESENCE_SERVICE_URL: "${PRESENCE_SERVICE_URL}"
    REDIS_HOST: "${REDIS_HOST}"
    STRIPE_SECRET_KEY: "${STRIPE_SECRET_KEY}"
    STRIPE_WEBHOOK_SECRET: "${STRIPE_WEBHOOK_SECRET}"
    TELEMETRY_TAGS_SERVICE_URL: "${TELEMETRY_TAGS_SERVICE_URL}"
    IFTTT_SERVICE_KEY: "${IFTTT_SERVICE_KEY}"
    API_V1_IFTTT_TEST_SETUP_URL: "${API_V1_IFTTT_TEST_SETUP_URL}"
    IFTTT_REALTIME_NOTIFICATIONS_URL: "${IFTTT_REALTIME_NOTIFICATIONS_URL}"
    INSTANA_SERVICE_NAME: "${INSTANA_SERVICE_NAME}"
    NUM_WORKERS: "${NUM_WORKERS}"
    DYNAMODB_TIMEOUT_MS: "${DYNAMODB_TIMEOUT_MS}"
    AUTH_TIMEOUT_MS: "${AUTH_TIMEOUT_MS}"
    SCIENCE_LAB_URL: "${SCIENCE_LAB_URL}"
    SENSOR_METER_URL: "${SENSOR_METER_URL}"
    PUCK_TOKEN_SECRET: "${PUCK_TOKEN_SECRET}"
    TWILIO_AUTH_TOKEN: "${TWILIO_AUTH_TOKEN}"
    PUBLIC_GATEWAY_HOST: "${PUBLIC_GATEWAY_HOST}"
internalIngress:
  host: internal-ingress.flocloud.co
routingIngress:
  annotations: {}
