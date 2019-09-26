image:
  tag: "${CI_PIPELINE_ID}"
secrets:
  datas:
    application_name: "${APPLICATION_NAME}"
    environment: development
    ACL_URL: "${ACL_URL}"
    API_V1_URL: "${API_V1_URL}"
    auth_url: "${AUTH_URL}"
    DYNAMO_TABLE_PREFIX: "${DYNAMO_TABLE_PREFIX}"
    EXTERNAL_SERVICE_HTTP_TIMEOUT_MS: "${EXTERNAL_SERVICE_HTTP_TIMEOUT_MS}"
    REDIS_HOST: "${FLO_API_REDIS_HOST}"
    HEALTH_TEST_SERVICE_URL: "${HEALTH_TEST_SERVICE_URL}"
    INFLUX_ANALYTICS_DB: "${INFLUX_ANALYTICS_DB}"
    INFLUX_HOST: "${INFLUX_HOST}"
    INFLUX_HOURLY_MEASUREMENT: "${INFLUX_HOURLY_MEASUREMENT}"
    INFLUX_PASSWORD: "${INFLUX_PASSWORD}"
    INFLUX_PORT: "${INFLUX_PORT}"
    INFLUX_SECOND_MEASUREMNT: '${INFLUX_SECOND_MEASUREMNT}'
    INFLUX_TELEMETRY_DB: "${INFLUX_TELEMETRY_DB}"
    INFLUX_USERNAME: "${INFLUX_USERNAME}"
    LOCALIZATION_API_URL: "${LOCALIZATION_API_URL}"
    NOTIFICATION_API_URL: "${NOTIFICATION_API_URL}"
    STRIPE_SECRET_KEY: "${STRIPE_SECRET_KEY}"
    STRIPE_WEBHOOK_SECRET: "${STRIPE_WEBHOOK_SECRET}"
    docs_endpoint_password: "${DOCS_ENDPOINT_PASSWORD}"
    docs_endpoint_user: "${DOCS_ENDPOINT_USER}"
    external_docs_endpoint_password: "${EXTERNAL_DOCS_ENDPOINT_PASSWORD}"
    external_docs_endpoint_user: "${EXTERNAL_DOCS_ENDPOINT_USER}"
    internal_device_service_base_url: '${INTERNAL_DEVICE_SERVICE_BASE_URL}'
    kafka_host: "${KAFKA_HOST}"
    kafka_timeout_ms: "${KAFKA_TIMEOUT_MS}"
    postgres_database: "${POSTGRES_DATABASE}"
    postgres_host: "${POSTGRES_HOST}"
    postgres_password: "${POSTGRES_PASSWORD}"
    postgres_port: "${POSTGRES_PORT}"
    postgres_user: "${POSTGRES_USER}"
    localization_url: '${LOCALIZATION_API_URL}'
internalIngress:
  host: internal-ingress.flocloud.co
routingIngress:
  annotations:
    nginx.ingress.kubernetes.io/upstream-vhost: internal-ingress.flocloud.co
