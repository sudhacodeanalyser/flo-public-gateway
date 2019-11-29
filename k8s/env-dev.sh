#!/bin/bash
set -e

envsubst < k8s/pipeline.yaml.tpl > k8s/pipeline.yaml
