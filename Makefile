.PHONY: start stop dev clean check-docker status down help

# One command to rule them all - CLI handles all setup
start: dev

# Start dev server (CLI handles setup: deps, Docker, Prisma)
dev:
	@yarn cli

# Stop all services (keeps containers)
stop:
	@docker stop happy-postgres happy-redis minio 2>/dev/null || true

# Stop and remove containers
down:
	@docker stop happy-postgres happy-redis minio 2>/dev/null || true
	@docker rm happy-postgres happy-redis minio 2>/dev/null || true

# Clean everything (including data)
clean: down
	@rm -rf .pgdata .minio node_modules

# Show status
status:
	@docker ps --filter name=happy-postgres --filter name=happy-redis --filter name=minio --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Help
help:
	@echo "Available commands:"
	@echo "  make start   - Start server (handles all setup automatically)"
	@echo "  make dev     - Same as start"
	@echo "  make stop    - Stop Docker services (keeps containers)"
	@echo "  make down    - Stop and remove Docker containers"
	@echo "  make clean   - Remove everything (containers, data, node_modules)"
	@echo "  make status  - Show Docker service status"
