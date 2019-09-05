image:
  tag: "${CI_PIPELINE_ID}"
secrets:
  datas:
    application_name: "${APPLICATION_NAME}"
    environment: production
    ACL_URL: "${ACL_URL_PROD}"
    API_V1_URL: "${API_V1_URL_PROD}"
    auth_url: "${AUTH_URL_PROD}"
    DYNAMO_TABLE_PREFIX: "${DYNAMO_TABLE_PREFIX_PROD}"
    EXTERNAL_SERVICE_HTTP_TIMEOUT_MS: "${EXTERNAL_SERVICE_HTTP_TIMEOUT_MS_PROD}"
    FLO_API_REDIS_HOST: "${FLO_API_REDIS_HOST_PROD}"
    HEALTH_TEST_SERVICE_URL: "${HEALTH_TEST_SERVICE_URL_PROD}"
    INFLUX_ANALYTICS_DB: "${INFLUX_ANALYTICS_DB_PROD}"
    INFLUX_HOST: "${INFLUX_HOST_PROD}"
    INFLUX_HOURLY_MEASUREMENT: "${INFLUX_HOURLY_MEASUREMENT_PROD}"
    INFLUX_PASSWORD: "${INFLUX_PASSWORD_PROD}"
    INFLUX_PORT: "${INFLUX_PORT_PROD}"
    INFLUX_SECOND_MEASUREMNT: '${INFLUX_SECOND_MEASUREMNT_PROD}'
    INFLUX_TELEMETRY_DB: "${INFLUX_TELEMETRY_DB_PROD}"
    INFLUX_USERNAME: "${INFLUX_USERNAME_PROD}"
    LOCALIZATION_API_URL: "${LOCALIZATION_API_URL_PROD}"
    NOTIFICATION_API_URL: "${NOTIFICATION_API_URL_PROD}"
    docs_endpoint_password: "${DOCS_ENDPOINT_PASSWORD_PROD}"
    docs_endpoint_user: "${DOCS_ENDPOINT_USER_PROD}"
    external_docs_endpoint_password: "${EXTERNAL_DOCS_ENDPOINT_PASSWORD_PROD}"
    external_docs_endpoint_user: "${EXTERNAL_DOCS_ENDPOINT_USER_PROD}"
    internal_device_service_base_url: "${INTERNAL_DEVICE_SERVICE_BASE_URL_PROD}"
    kafka_host: "${KAFKA_HOST_PROD}"
    kafka_timeout_ms: "${KAFKA_TIMEOUT_MS_PROD}"
    postgres_database: "${POSTGRES_DATABASE_PROD}"
    postgres_host: "${POSTGRES_HOST_PROD}"
    postgres_password: "${POSTGRES_PASSWORD_PROD}"
    postgres_port: "${POSTGRES_PORT_PROD}"
    postgres_user: "${POSTGRES_USER_PROD}"
    localization_url: "${LOCALIZATION_API_URL_PROD}"
internalIngress:
  host: internal-ingress.flosecurecloud.com
routingIngress:
  annotations:
    nginx.ingress.kubernetes.io/upstream-vhost: internal-ingress.flosecurecloud.com
v1ProxyService:
  floApiV1Hostname: not-for-public-use-api-gw.meetflo.com
