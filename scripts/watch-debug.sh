#!/bin/sh

docker-compose down && \
NPM_SCRIPT=watch-debug docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --remove-orphans --build
