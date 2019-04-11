#!/bin/sh

container_id=`docker ps -q --filter "name=flo-nodejs-service-template"`

if [ -z $container_id ]; then
  # No Docker container running. Launch it.
  docker-compose down && \
  NPM_SCRIPT=serve docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --remove-orphans --build

  container_id=`docker ps -q --filter "name=flo-nodejs-service-template"`
  docker exec -it $container_id /bin/sh -c "npm test"

  docker-compose down
else
  # Existing Docker container running. Run script.
  docker exec -it $container_id /bin/sh -c "npm test"
fi


