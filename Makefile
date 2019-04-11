DOCKER  ?= $(shell which docker)
COMPOSE ?= $(shell which docker-compose)

.PHONY: help
help: ## Display this help screen (default)
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.PHONY: dev-watch
dev-watch: testdocker ## Launch in Docker, Debug Port 9229, Reload on file change 
	@./scripts/watch-debug.sh

.PHONY: test 
test: testdocker ## Run singe tests using Jest
	@./scripts/run-tests.sh

.PHONY: watch-tests 
watch-tests: testdocker ## Run singe tests using Jest in watch mode
	@./scripts/watch-tests.sh

.PHONY: dev 
dev: testdocker ## Launch in Docker, Debug Port 9229
	@./scripts/dev.sh

.PHONY: prod
prod: testdocker ## Build and Run Production Docker Build
	@./scripts/prod.sh

# Ensures docker is installed - does not enforce version, please use latest
testdocker:
ifeq (, $(DOCKER))
	$(error "Docker is not installed or incorrectly configured. https://www.docker.com/")
else
	@$(DOCKER) --version
endif
