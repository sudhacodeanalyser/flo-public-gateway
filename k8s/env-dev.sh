#!/bin/bash
set -e

ENVIRONMENT=$1

envsubst < k8s/pipeline.yaml.tpl > k8s/pipeline.yaml
