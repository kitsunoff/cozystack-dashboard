REGISTRY ?= ghcr.io/kitsunoff
TAG      ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

.PHONY: help show apply diff delete image image-push

help:
	@echo "Targets:"
	@echo "  show        Render Helm templates"
	@echo "  apply       Deploy to cluster"
	@echo "  diff        Show diff against cluster"
	@echo "  delete      Remove from cluster"
	@echo "  image       Build container image"
	@echo "  image-push  Build and push image"

show:
	helm template $(NAME) . --namespace $(NAMESPACE) --set image.tag=$(TAG)

apply:
	helm upgrade --install $(NAME) . --namespace $(NAMESPACE) --create-namespace --set image.tag=$(TAG)

diff:
	helm diff upgrade $(NAME) . --namespace $(NAMESPACE) --set image.tag=$(TAG)

delete:
	helm uninstall $(NAME) --namespace $(NAMESPACE)

image:
	podman build --tag $(REGISTRY)/cozystack-dashboard:$(TAG) --file ../../../Containerfile ../../..

image-push: image
	podman push $(REGISTRY)/cozystack-dashboard:$(TAG)
