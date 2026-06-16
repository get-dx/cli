.DEFAULT_GOAL := reinstall

.PHONY: reinstall install uninstall deps build link test lint typecheck verify format format-check dev

reinstall: deps build link

install: reinstall

verify: format-check typecheck lint test

deps:
	pnpm install

build:
	./bin/build

link:
	pnpm link --global .

uninstall:
	pnpm uninstall --global @get-dx/cli

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
