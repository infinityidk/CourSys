.PHONY: release
release:
	cd frontend && pnpm build
	cargo build --release