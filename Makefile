APP ?= flo-public-gateway

# Default env is always dev. This can be overriden
ENV ?= dev
AWS_REGION ?= us-west-2
EB_DEPLOY_TIMEOUT ?= 15
HELM_CHART ?= $(APP)
HELM_DEPLOY_TIMEOUT ?= 180
HELM_HISTORY_MAX ?= 3
HELM_HISTORY_MAX ?= 3
HELM_RELEASE_NAME ?= $(APP)
K8S_NAMESPACE ?= $(APP)
DOCKER_IMAGE ?= ${CI_REGISTRY_IMAGE}
DOCKER_REGISTRY ?= registry.gitlab.com/flotechnologies
DOCKER_TAG ?= latest
DOCKER  ?= $(shell which docker)
COMPOSE ?= $(shell which docker-compose)
CURL ?= $(shell which curl)
NODE_ENV ?= development
GRADLE ?= $(COMPOSE) -f build-tools.yml run --rm gradle
GIT ?= $(COMPOSE) -f build-tools.yml run --rm git
HELM ?= $(shell which helm)
RUNSCOPE_IMAGE ?= $(DOCKER_REGISTRY)/devops/runscope-python-trigger:latest
COMMIT_SHA ?= 'nosh'

TARGET_ARCH := $(shell uname -m)
ifeq ($(TARGET_ARCH),arm64)
RUN ?= $(COMPOSE) -f build-tools.yml run --rm --service-ports run-arm64 --node-env=$(NODE_ENV) run
NPM ?= $(COMPOSE) -f build-tools.yml run --rm npm-arm64 --node-env=$(NODE_ENV)
else
RUN ?= $(COMPOSE) -f build-tools.yml run --rm --service-ports run --node-env=$(NODE_ENV) run
NPM ?= $(COMPOSE) -f build-tools.yml run --rm npm --node-env=$(NODE_ENV)
endif

.PHONY: help auth
help: ## Display this help screen (default)
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

full: ## Compile and run internally
	$(DOCKER) build --tag flo-public-gateway:local -f Dockerfile.full .
	$(COMPOSE) -f docker-compose-full.yml up

write-env: ## append the necessary env var
	@echo "" >> .env
	@echo "COMMIT_SHA=$(COMMIT_SHA)" >> .env

build: install write-env
	$(COMPOSE) -f build-tools.yml $(@) --pull build
	$(COMPOSE) $(@) --pull app
	$(COMPOSE) $(@) --pull app-tag

install: docker ## Install npm packages using docker-based npm
	$(NPM) ci --omit=optional

audit: docker ## Install npm packages using docker-based npm
	$(NPM) $(@) fix

test: docker ## Run test task using docker-based npm
	$(NPM) run explain
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

debug-helm:
	$(HELM) template \
		./k8s/$(HELM_CHART) \
		--name $(HELM_RELEASE_NAME) \
		--values k8s/pipeline.yaml \
		--set environment=$(ENV) \
		--namespace=$(K8S_NAMESPACE)

deploy:
	$(HELM) upgrade \
		$(HELM_RELEASE_NAME) \
		./k8s/$(HELM_CHART) \
		--install \
		--values ./k8s/pipeline.yaml \
		--values ./k8s/extra-$(ENV).yaml \
		--set environment=$(ENV) \
		--namespace=$(K8S_NAMESPACE) --create-namespace \
		--wait --timeout $(HELM_DEPLOY_TIMEOUT)s

deploy-status:
	$(HELM) history --max $(HELM_HISTORY_MAX) $(HELM_RELEASE_NAME) -n $(K8S_NAMESPACE)
	$(HELM) status $(HELM_RELEASE_NAME) -n $(K8S_NAMESPACE)

environment:
	kube-svc-ctl generate-svc-config -service $(APP) -tag "${CI_PIPELINE_ID}" > ./k8s/pipeline.yaml

runscope:
	$(DOCKER) \
		pull \
		$(RUNSCOPE_IMAGE)
	$(DOCKER) \
		run --rm --tty\
		--env RUNSCOPE_ACCESS_TOKEN="$(RUNSCOPE_ACCESS_TOKEN)" \
		--env RUNSCOPE_TRIGGER_URL="$(RUNSCOPE_TRIGGER_URL)" \
		$(RUNSCOPE_IMAGE)

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
