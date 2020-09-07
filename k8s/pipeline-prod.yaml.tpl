image:
  tag: "${CI_PIPELINE_ID}"
secrets:
  datas:
    APPLICATION_NAME: "${APPLICATION_NAME}"
    ENVIRONMENT: "${ENV}"
    ACL_URL: "${ACL_URL_PROD}"
    API_V1_URL: "${API_V1_URL_PROD}"
    AUTH_URL: "${AUTH_URL_PROD}"
    DOCS_ENDPOINT_PASSWORD: "${DOCS_ENDPOINT_PASSWORD_PROD}"
    DOCS_ENDPOINT_USER: "${DOCS_ENDPOINT_USER_PROD}"
    DYNAMO_TABLE_PREFIX: "${DYNAMO_TABLE_PREFIX_PROD}"
    EXTERNAL_DOCS_ENDPOINT_PASSWORD: "${EXTERNAL_DOCS_ENDPOINT_PASSWORD_PROD}"
    EXTERNAL_DOCS_ENDPOINT_USER: "${EXTERNAL_DOCS_ENDPOINT_USER_PROD}"
    EXTERNAL_SERVICE_HTTP_TIMEOUT_MS: "${EXTERNAL_SERVICE_HTTP_TIMEOUT_MS_PROD}"
    HEALTH_TEST_SERVICE_URL: "${HEALTH_TEST_SERVICE_URL_PROD}"
    INFLUX_ANALYTICS_DB: "${INFLUX_ANALYTICS_DB_PROD}"
    INFLUX_HOST: "${INFLUX_HOST_PROD}"
    INFLUX_HOURLY_MEASUREMENT: "${INFLUX_HOURLY_MEASUREMENT_PROD}"
    INFLUX_PASSWORD: "${INFLUX_PASSWORD_PROD}"
    INFLUX_PORT: "${INFLUX_PORT_PROD}"
    INFLUX_SECOND_MEASUREMNT: '${INFLUX_SECOND_MEASUREMNT_PROD}'
    INFLUX_TELEMETRY_DB: "${INFLUX_TELEMETRY_DB_PROD}"
    INFLUX_USERNAME: "${INFLUX_USERNAME_PROD}"
    INTERNAL_DEVICE_SERVICE_BASE_URL: "${INTERNAL_DEVICE_SERVICE_BASE_URL_PROD}"
    KAFKA_HOST: "${KAFKA_HOST_PROD}"
    KAFKA_TIMEOUT_MS: "${KAFKA_TIMEOUT_MS_PROD}"
    LOCALIZATION_API_URL: "${LOCALIZATION_API_URL_PROD}"
    NOTIFICATION_API_URL: "${NOTIFICATION_API_URL_PROD}"
    POSTGRES_DATABASE: "${POSTGRES_DATABASE_PROD}"
    POSTGRES_HOST: "${POSTGRES_HOST_PROD}"
    POSTGRES_PASSWORD: "${POSTGRES_PASSWORD_PROD}"
    POSTGRES_PORT: "${POSTGRES_PORT_PROD}"
    POSTGRES_USER: "${POSTGRES_USER_PROD}"
    PRESENCE_SERVICE_URL: "${PRESENCE_SERVICE_URL_PROD}"
    REDIS_HOST: "${REDIS_HOST_PROD}"
    STRIPE_SECRET_KEY: "${STRIPE_SECRET_KEY_PROD}"
    STRIPE_WEBHOOK_SECRET: "${STRIPE_WEBHOOK_SECRET_PROD}"
    TELEMETRY_TAGS_SERVICE_URL: "${TELEMETRY_TAGS_SERVICE_URL_PROD}"
    IFTTT_SERVICE_KEY: "${IFTTT_SERVICE_KEY_PROD}"
    API_V1_IFTTT_TEST_SETUP_URL: "${API_V1_IFTTT_TEST_SETUP_URL_PROD}"
    IFTTT_REALTIME_NOTIFICATIONS_URL: "${IFTTT_REALTIME_NOTIFICATIONS_URL_PROD}"
    INSTANA_SERVICE_NAME: "${INSTANA_SERVICE_NAME}"
    NUM_WORKERS: "${NUM_WORKERS_PROD}"
    DYNAMODB_TIMEOUT_MS: "${DYNAMODB_TIMEOUT_MS_PROD}"
    AUTH_TIMEOUT_MS: "${AUTH_TIMEOUT_MS_PROD}"
    SCIENCE_LAB_URL: "${SCIENCE_LAB_URL_PROD}"
    SENSOR_METER_URL: "${SENSOR_METER_URL_PROD}"
    PUCK_TOKEN_SECRET: "${PUCK_TOKEN_SECRET_PROD}"
    TWILIO_AUTH_TOKEN: "${TWILIO_AUTH_TOKEN_PROD}"
    PUBLIC_GATEWAY_HOST: "${PUBLIC_GATEWAY_HOST_PROD}"
    SEND_WITH_US_KEY: "${SEND_WITH_US_KEY_PROD}"
    FLO_DETECT_API_URL: "${FLO_DETECT_API_URL_PROD}"
    WEATHER_API_URL: "${WEATHER_API_URL_PROD}"
    API_V1_TOKEN: "${API_V1_TOKEN_PROD}"
    EMAIL_GATEWAY_URL: "${EMAIL_GATEWAY_URL_PROD}"
    WATER_METER_SERVICE_URL: "${WATER_METER_SERVICE_URL_PROD}"
    GOOGLE_MAPS_API_KEY: "${GOOGLE_MAPS_API_KEY_PROD}"
internalIngress:
  host: internal-ingress.flosecurecloud.com
routingIngress:
  annotations: {}
v1ProxyService:
  floApiV1Hostname: not-for-public-use-api-gw.meetflo.com
