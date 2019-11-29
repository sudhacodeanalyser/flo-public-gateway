#!/bin/bash
set -e

envsubst < k8s/pipeline-prod.yaml.tpl > k8s/pipeline.yaml
