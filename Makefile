APP ?= flo-public-gateway

# Default env is always dev. This can be overriden
ENV ?= dev
AWS_REGION ?= us-west-2
EB_DEPLOY_TIMEOUT ?= 15
DOCKER_IMAGE ?= ${CI_REGISTRY_IMAGE}
DOCKER_REGISTRY ?= registry.gitlab.com/flotechnologies
DOCKER_TAG ?= latest
DOCKER  ?= $(shell which docker)
COMPOSE ?= $(shell which docker-compose)
NODE_ENV ?= development
NPM ?= $(COMPOSE) -f build-tools.yml run --rm npm --node-env=$(NODE_ENV)
GRADLE ?= $(COMPOSE) -f build-tools.yml run --rm gradle
GIT ?= $(COMPOSE) -f build-tools.yml run --rm git
RUN ?= $(COMPOSE) -f build-tools.yml run --rm --service-ports run --node-env=$(NODE_ENV) run
EB_INIT ?= $(COMPOSE) -f build-tools.yml run --rm eb init $(APP) --region=${AWS_REGION} --platform docker-18.06.1-ce
EB_DEPLOY ?= $(COMPOSE) -f build-tools.yml run --rm eb deploy $(APP)-$(ENV) --staged --timeout $(EB_DEPLOY_TIMEOUT)
HELM ?= $(shell which helm)

.PHONY: help auth
help: ## Display this help screen (default)
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

full: ## Compile and run internally
	$(DOCKER) build --tag flo-public-gateway:local -f Dockerfile.full .
	$(COMPOSE) -f docker-compose-full.yml up

build: install
	$(COMPOSE) -f build-tools.yml $(@) --pull build
	$(COMPOSE) $(@) --pull app
	$(COMPOSE) $(@) --pull app-tag

install: docker ## Install npm packages using docker-based npm
	$(NPM) $(@)

audit: docker ## Install npm packages using docker-based npm
	-$(NPM) $(@) fix

test: docker ## Run test task using docker-based npm
	$(NPM) run $(@)

run: serve
serve: docker ## Run serve task using docker-based npm
	$(RUN) $(@)

watch: docker ## Run watch task using docker-based npm
	$(RUN) $(@)

watch-test: docker ## Run watch-test task using docker-based npm
	$(RUN) $(@)

watch-debug: docker ## Run watch-debug task using docker-based npm
	$(RUN) $(@)
	$(COMPOSE) -f docker-compose-full.yml down

up: docker build ## Build and run application as it would be run in production (from image)
	$(COMPOSE) $(@)

down: docker ## Stop application if running in the background
	$(COMPOSE) $(@)

pull: docker
	$(COMPOSE) $(@) --quiet || true
	$(COMPOSE) -f build-tools.yml $(@) --quiet || true

push: docker
	$(COMPOSE) $(@)
	$(COMPOSE) -f build-tools.yml $(@) || true

deploy:
	$(GRADLE) preDeploy
	$(GIT) add .
	$(EB_INIT)
	$(EB_DEPLOY)

deploy-k8s:
	$(HELM) init --upgrade --wait --force-upgrade
	$(HELM) ls
	$(HELM) upgrade --install $(APP) ./k8s/flo-public-gateway -f ./k8s/pipeline.yaml  --set environment=${params.environment} --namespace=flo-public-gateway

render-template:
	$(HELM) template ./k8s/flo-public-gateway -f ./k8s/pipeline.yaml  --set environment=${params.environment} --namespace=flo-public-gateway

environment-dev:
	chmod +x ./k8s/env-dev.sh
	./k8s/env-dev.sh

environment-prod:
	chmod +x ./k8s/env-prod.sh
	./k8s/env-prod.sh

clean: down ## Remove build arifacts & related images
	rm -rf node_modules
	$(COMPOSE) kill
	$(DOCKER) rmi -f $$($(DOCKER) images -f "dangling=true" -q)

# Ensures docker is installed - does not enforce version, please use latest
docker: docker-compose
ifeq (, $(DOCKER))
	$(error "Docker is not installed or incorrectly configured. https://www.docker.com/")
else
	@$(DOCKER) --version
endif

# Ensures docker-compose is installed - does not enforce.
docker-compose:
ifeq (, $(COMPOSE))
	$(error "docker-compose is not installed or incorrectly configured.")
else
	@$(COMPOSE) --version
endif
