APP ?= flo-public-gateway
ENV ?= $(shell current_branch=$$(git rev-parse --abbrev-ref HEAD); if [[ $$current_branch == "master" ]]; then current_env="prod"; else current_env=$${current_branch%.*}; fi; echo "$$current_env")
AWS_REGION ?= us-west-2
DOCKER_IMAGE ?= ${CI_REGISTRY_IMAGE}
DOCKER_REGISTRY ?= registry.gitlab.com/flotechnologies
DOCKER_TAG ?= latest
DOCKER  ?= $(shell which docker)
COMPOSE ?= $(shell which docker-compose)
NODE_ENV ?= development
NPM ?= $(COMPOSE) -f build-tools.yml run --rm npm --node-env=$(NODE_ENV)
GRADLE ?= $(COMPOSE) -f build-tools.yml run --rm gradle
RUN ?= $(COMPOSE) -f build-tools.yml run --rm --service-ports run --node-env=$(NODE_ENV) run
EB_INIT ?= $(COMPOSE) -f build-tools.yml run --rm eb init $(APP)-$(ENV) --profile=flo-${ENV} --region=${AWS_REGION} --platform docker-18.06.1-ce
EB_DEPLOY ?= $(COMPOSE) -f build-tools.yml run --rm eb deploy $(APP)-$(ENV) --profile=flo-${ENV} --staged

.PHONY: help auth
help: ## Display this help screen (default)
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

build: install
	$(COMPOSE) $(@) app

install: docker ## Install npm packages using docker-based npm
	$(NPM) $(@)

test: docker ## Run test task using docker-based npm
	$(NPM) run $(@)

run: serve
serve: docker ## Run serve task using docker-based npm
	$(RUN) $(@)

watch: docker ## Run watch task using docker-based npm
	$(RUN) run $(@)

watch-test: docker ## Run watch-test task using docker-based npm
	$(RUN) run $(@)

watch-debug: docker ## Run watch-debug task using docker-based npm
	$(RUN) run $(@)

up: docker build ## Build and run application as it would be run in production (from image)
	$(COMPOSE) $(@)

down: docker ## Stop application if running in the background
	$(COMPOSE) $(@)

deploy:
#	$(GRADLE) extractAppTemplates
	$(EB_INIT)
	$(EB_DEPLOY)

clean: down ## Remove build arifacts & related images
	rm -rf node_modules
	$(COMPOSE) kill

auth:
	mkdir -p ~/.aws/
	# TODO: This should be crafting aws key name based on the uppercase env name
	echo -e "[flo-${ENV}]\naws_access_key_id=$AWS_ACCESS_KEY_ID\naws_secret_access_key=$AWS_SECRET_ACCESS_KEY\n" > ~/.aws/credentials

env:
	@echo "ENV: $(ENV)"

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
