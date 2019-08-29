image:
  tag: "${CI_PIPELINE_ID}"
secrets:
  datas:
    application_name: "${APPLICATION_NAME}"
    environment: development
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
  host: internal-ingress.flosecurecloud.com
routingIngress:
  annotations:
    nginx.ingress.kubernetes.io/upstream-vhost: internal-ingress.flosecurecloud.com