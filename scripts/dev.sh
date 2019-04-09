#!/bin/sh

docker-compose down && \
NPM_SCRIPT=start docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --remove-orphans --build