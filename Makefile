.PHONY: run release
run:
	cargo test
	cd frontend && pnpm build
	cd backend && cargo run

release:
	cargo test
	cd frontend && pnpm build
	cargo build --release