.DEFAULT_GOAL := reinstall

.PHONY: reinstall install deps build link test lint typecheck verify format format-check

reinstall: deps build link

install: reinstall

verify: format-check typecheck lint test

deps:
	pnpm install

build:
	pnpm build

link:
	pnpm link --global

test:
	pnpm test

lint:
	pnpm lint

typecheck:
	pnpm typecheck

format:
	pnpm format

format-check:
	pnpm format:check
