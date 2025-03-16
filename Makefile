help: ## usage
	@cat Makefile | grep -E '^[a-zA-Z_-]+:.*?## .*$$' | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

build: ## build docker image
	@docker build \
		--tag nicholasodonnell/mirror-bot:latest \
		.

clean: ## remove docker images
	@docker rmi \
		--force \
			nicholasodonnell/mirror-bot:latest

.PHONY: \
	help \
	build \
	clean
