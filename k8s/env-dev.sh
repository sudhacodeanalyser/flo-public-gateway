#!/bin/sh

ENVIRONMENT=$1

sed -i  "s/  tag:.*/  tag: '$CI_PIPELINE_ID'/g" k8s/pipeline.yaml
sed -i  "s/    application_name:.*/    application_name: $APPLICATION_NAME/g" k8s/pipeline.yaml
sed -i  "s/    docs_endpoint_password:.*/    docs_endpoint_password: $DOCS_ENDPOINT_PASSWORD/g" k8s/pipeline.yaml
sed -i  "s/    docs_endpoint_user:.*/    docs_endpoint_user: $DOCS_ENDPOINT_USER/g" k8s/pipeline.yaml
sed -i  "s/    environment:.*/    environment: dev/g" k8s/pipeline.yaml
sed -i  "s/    external_docs_endpoint_password:.*/    external_docs_endpoint_password: $EXTERNAL_DOCS_ENDPOINT_PASSWORD/g" k8s/pipeline.yaml
sed -i  "s/    external_docs_endpoint_user:.*/    external_docs_endpoint_user: $EXTERNAL_DOCS_ENDPOINT_USER/g" k8s/pipeline.yaml
sed -i  "s/    internal_device_service_base_url:.*/    internal_device_service_base_url: $INTERNAL_DEVICE_SERVICE_BASE_URL/g" k8s/pipeline.yaml
sed -i  "s/    kafka_host:.*/    kafka_host: $KAFKA_HOST/g" k8s/pipeline.yaml
sed -i  "s/    kafka_timeout_ms:.*/    kafka_timeout_ms: '$KAFKA_TIMEOUT_MS'/g" k8s/pipeline.yaml
sed -i  "s/    psotgres_database:.*/    psotgres_database: $POSTGRES_DATABASE/g" k8s/pipeline.yaml
sed -i  "s/    postgres_host:.*/    postgres_host: $POSTGRES_HOST/g" k8s/pipeline.yaml
sed -i  "s/    postgres_password:.*/    postgres_password: $POSTGRES_PASSWORD/g" k8s/pipeline.yaml
sed -i  "s/    postgres_port:.*/    postgres_port: '$POSTGRES_PORT'/g" k8s/pipeline.yaml
sed -i  "s/    postgres_user:.*/    postgres_user: $POSTGRES_USER/g" k8s/pipeline.yaml