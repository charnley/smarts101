.PHONY: generate build clean

TREE_SITTER ?= tree-sitter
OUT_WASM = tree-sitter-smarts.wasm

generate:
	$(TREE_SITTER) generate

build: generate
	$(TREE_SITTER) build --wasm -o $(OUT_WASM)

clean:
	rm -rf src/ $(OUT_WASM)
