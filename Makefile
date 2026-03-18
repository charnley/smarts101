
node_modules:
	pnpm i

build: node_modules
	pnpm run build

format:
	npx prettier --write .

test-format:
	npx prettier --check .

dev:
	pnpm run dev --open

start-storybook:
	npx storybook dev -p 6006
