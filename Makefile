.PHONY: build format dev build-wasm

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

dep: ./src/lib/grammar-smarts/tree-sitter-smarts.wasm

build-wasm:
	cd $(TREE_SITTER_DIR) && $(TREE_SITTER) build --wasm

./src/lib/grammar-smarts/tree-sitter-smarts.wasm: build-wasm

format:
	npx prettier --write .

test-format:
	npx prettier --check .

# Start

dev: dep
	pnpm run dev

start-storybook:
	npx storybook dev -p 6006
