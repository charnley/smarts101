.PHONY: build format dev build-wasm build-docker start-docker

TREE_SITTER ?= npx tree-sitter
TREE_SITTER_DIR = ./src/lib/grammar-smarts

all: node_modules .env

# Build

node_modules:
	pnpm i

.env:
	ln -s .env.example .env

build: dep
	pnpm run build

build-site:
	npx vite build

dep: ./src/lib/grammar-smarts/tree-sitter-smarts.wasm

build-wasm:
	cd $(TREE_SITTER_DIR) && $(TREE_SITTER) generate && $(TREE_SITTER) build --wasm

./src/lib/grammar-smarts/tree-sitter-smarts.wasm: ./src/lib/grammar-smarts/grammar.js
	make build-wasm

format:
	npx prettier --write .

test-format:
	npx prettier --check .

test:
	npm run test:grammar

# Start

dev: dep
	pnpm run dev

start-storybook:
	npx storybook dev -p 6006

# Docker

build-docker:
	docker build -f docker/Dockerfile -t smarts101 .

start-docker:
	docker run -p 8080:80 smarts101
