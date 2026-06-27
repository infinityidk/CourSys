.PHONY: run release
run:
	cd frontend && pnpm build
	cd backend && cargo run

release:
	cd frontend && pnpm build
	cargo build --release