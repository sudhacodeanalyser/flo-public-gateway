FROM node:10-alpine

# Needed a workaround to maintain node_modules folder in sync between container and host.
# https://stackoverflow.com/questions/51097652/install-node-modules-inside-docker-container-and-synchronize-them-with-host

ARG NODE_ENV=development

# Create and define the node_modules's cache directory.
RUN mkdir -p /usr/src/cache
WORKDIR /usr/src/cache

# Install the application's dependencies into the node_modules's cache directory.
COPY package.json ./
COPY package-lock.json ./

RUN rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    apk update && \
    apk add --no-cache --virtual .gyp gcc g++ make python
RUN if [ "$NODE_ENV" = "development" ]; \
    then npm install --quiet; \
    else npm install --quiet --only=production; \
    fi

# Create and define the application's working directory.
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app