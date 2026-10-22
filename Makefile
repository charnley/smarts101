.PHONY: build format dev build-grammar-wasm build-rdkit-image build-smarter-smarts-wasm build-docker start-docker readme-hero

PORT=5173
TREE_SITTER ?= npx tree-sitter
TREE_SITTER_DIR = ./src/lib/grammar-smarts

RDKIT_TAG ?= Release_2026_09_1
RDKIT_BUILD_IMAGE=rdkit-build-image
SMARTER_SMARTS_DIR=./src/lib/smarter-smarts

# Extra `docker build` flags for the RDKit image, e.g. a layer cache in CI
DOCKER_BUILD_FLAGS ?=

all: node_modules .env

# Build

node_modules:
	pnpm i

.env:
	ln -s .env.example .env

build: dep
	pnpm run build

dep: $(TREE_SITTER_DIR)/tree-sitter-smarts.wasm $(SMARTER_SMARTS_DIR)/smarter-smarts.wasm

# Docker

build-rdkit-image: ./docker/rdkitlib.Dockerfile
	docker build -t ${RDKIT_BUILD_IMAGE} -f ./docker/rdkitlib.Dockerfile \
		$(if $(RDKIT_TAG),--build-arg RDKIT_TAG=$(RDKIT_TAG)) $(DOCKER_BUILD_FLAGS) ./docker

# WASM

$(TREE_SITTER_DIR)/tree-sitter-smarts.wasm: $(TREE_SITTER_DIR)/grammar.js
	make build-grammar-wasm

build-grammar-wasm:
	cd $(TREE_SITTER_DIR) && $(TREE_SITTER) generate && $(TREE_SITTER) build --wasm

$(SMARTER_SMARTS_DIR)/smarter-smarts.wasm: $(SMARTER_SMARTS_DIR)/src/smarter-smarts.cpp
	make build-rdkit-image build-smarter-smarts-wasm

build-smarter-smarts-wasm:
	docker run --rm -v ${SMARTER_SMARTS_DIR}:/src/smarter-smarts ${RDKIT_BUILD_IMAGE} bash -c 'source /opt/emsdk/emsdk_env.sh && cd /src/smarter-smarts && make clean && make'

build-docker: dep ./docker/Dockerfile
	docker build -f docker/Dockerfile -t smarts101 .

start-docker:
	docker run -p 8080:80 smarts101

# Test

format:
	npx prettier --write .

test-format:
	npx prettier --check .

test:
	npm run test:grammar

# Start

dev: dep
	npx vite dev --force --host 0.0.0.0 --port ${PORT}

start-storybook:
	npx storybook dev -p 6006

# Screenshot

readme-hero:
	npx playwright test e2e/screenshot.spec.js
	magick static/screenshots/_desktop.png static/screenshots/_mobile.png \
		-background '#f4f4f4' -gravity center +smush 40 \
		-bordercolor '#f4f4f4' -border 40 \
		static/screenshots/hero.png
	rm -f static/screenshots/_desktop.png static/screenshots/_mobile.png
