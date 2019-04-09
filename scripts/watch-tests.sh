#!/bin/sh

container_id=`docker ps -q --filter "name=flo-nodejs-service-template"`

if [ -z $container_id ]; then
  # No Docker container running. Launch it.
  docker-compose down && \
  NPM_SCRIPT=watch-test docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --remove-orphans --build
else
  # Existing Docker container running. Run script.
  docker exec -it $container_id /bin/sh -c "npm watch-test"
fi


