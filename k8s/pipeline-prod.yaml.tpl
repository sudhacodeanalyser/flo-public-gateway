image:
  tag: "${CI_PIPELINE_ID}"
secrets:
  datas:
    application_name: "${APPLICATION_NAME_PROD}"
    environment: production
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