.PHONY: build format dev

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
