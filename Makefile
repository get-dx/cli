.DEFAULT_GOAL := reinstall

.PHONY: reinstall install deps build link test

reinstall: deps build link

install: reinstall

deps:
	pnpm install

build:
	pnpm build

link:
	pnpm link --global

test:
	pnpm test
