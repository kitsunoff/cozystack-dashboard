REGISTRY ?= ghcr.io/kitsunoff
TAG      ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
IMAGE     = $(REGISTRY)/cozystack-dashboard:$(TAG)

.PHONY: image image-push

image: ## Build container image
	podman build --tag $(IMAGE) --file Containerfile .

image-push: image ## Build and push container image
	podman push $(IMAGE)
