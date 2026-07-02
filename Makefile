.PHONY: build format dev build-wasm build-docker start-docker readme-hero

PORT=5173
TREE_SITTER ?= npx tree-sitter
TREE_SITTER_DIR = ./src/lib/grammar-smarts

RDKIT_DIR=
RDKIT_CONTEXT=
RDKIT_BUILD_IMAGE=rdkit-build-image

all: node_modules .env

# Build

node_modules:
	pnpm i

.env:
	ln -s .env.example .env

build: dep
	pnpm run build

dep: ./src/lib/grammar-smarts/tree-sitter-smarts.wasm

build-wasm:
	cd $(TREE_SITTER_DIR) && $(TREE_SITTER) generate && $(TREE_SITTER) build --wasm

./src/lib/grammar-smarts/tree-sitter-smarts.wasm: ./src/lib/grammar-smarts/grammar.js
	make build-wasm

build-rdkit-build-image:
	test -d "${RDKIT_CONTEXT}/${RDKIT_DIR}"
	docker build -t ${RDKIT_BUILD_IMAGE} -f ./docker/rdkitlib.Dockerfile --build-arg "RDKIT_DIR=${RDKIT_DIR}" ${RDKIT_CONTEXT}

build-smarter-smarts-wasm:
	docker run --rm -v ./src/lib/smarter-smarts/:/src/smarter-smarts ${RDKIT_BUILD_IMAGE} bash -c 'source /opt/emsdk/emsdk_env.sh && cd /src/smarter-smarts && make clean && make'

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

# Docker

build-docker:
	docker build -f docker/Dockerfile -t smarts101 .

start-docker:
	docker run -p 8080:80 smarts101

# Screenshot

readme-hero:
	npx playwright test e2e/screenshot.spec.js
	magick static/screenshots/_desktop.png static/screenshots/_mobile.png \
		-background '#f4f4f4' -gravity center +smush 40 \
		-bordercolor '#f4f4f4' -border 40 \
		static/screenshots/hero.png
	rm -f static/screenshots/_desktop.png static/screenshots/_mobile.png
