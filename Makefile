.PHONY: build format dev build-wasm

TREE_SITTER ?= tree-sitter
TREE_SITTER_DIR = tree-sitter-smarts

all: node_modules .env

node_modules:
	pnpm i

.env:
	ln -s .env.example .env

build:
	pnpm run build

format:
	npx prettier --write .

test-format:
	npx prettier --check .

dev:
	pnpm run dev

start-storybook:
	npx storybook dev -p 6006

build-wasm:
	make -C $(TREE_SITTER_DIR) build TREE_SITTER=$(TREE_SITTER)
	cp $(TREE_SITTER_DIR)/tree-sitter-smarts.wasm src/lib/tree-sitter-smarts.wasm
