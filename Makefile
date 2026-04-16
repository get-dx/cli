.DEFAULT_GOAL := reinstall

.PHONY: reinstall install deps build link test lint typecheck verify format format-check dev

reinstall: deps build link

install: reinstall

verify: format-check typecheck lint test

deps:
	pnpm install

build:
	pnpm build
	cp src/commands/scorecard-blank-template.yaml dist/commands/
	cp src/commands/catalog/entity-type-blank-template.yaml dist/commands/catalog/

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

dev:
	watchexec --clear=reset --watch src/ make
