.PHONY: start stop setup dev db redis s3 install generate migrate clean check-docker status down

# One command to rule them all
start: setup dev

# Full setup: install deps, start services, run migrations
setup: install check-docker services generate migrate

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@yarn install

# Check and start Docker if needed
check-docker:
	@echo "🐳 Checking Docker..."
	@if ! command -v docker > /dev/null 2>&1; then \
		echo "❌ Docker is not installed."; \
		echo "   Please install Docker Desktop from: https://www.docker.com/products/docker-desktop/"; \
		exit 1; \
	fi
	@if ! docker info > /dev/null 2>&1; then \
		echo "🐳 Docker is not running. Starting Docker Desktop..."; \
		open -a Docker 2>/dev/null || (echo "❌ Could not start Docker Desktop. Please start it manually." && exit 1); \
		echo "⏳ Waiting for Docker to start (this may take a moment)..."; \
		for i in $$(seq 1 60); do \
			if docker info > /dev/null 2>&1; then \
				echo ""; \
				echo "✅ Docker is ready!"; \
				break; \
			fi; \
			if [ $$i -eq 60 ]; then \
				echo ""; \
				echo "❌ Docker failed to start after 60 seconds."; \
				echo "   Please start Docker Desktop manually and try again."; \
				exit 1; \
			fi; \
			printf "."; \
			sleep 1; \
		done; \
	else \
		echo "✅ Docker is already running"; \
	fi

# Start all services (db, redis, s3)
services: db redis s3
	@echo "⏳ Waiting for services to be ready..."
	@sleep 3
	@echo "✅ All services started!"

# Start PostgreSQL
db:
	@echo "🐘 Starting PostgreSQL..."
	@if docker ps -q -f name=^happy-postgres$$ | grep -q .; then \
		echo "   Already running"; \
	elif docker start happy-postgres > /dev/null 2>&1; then \
		echo "   Started existing container"; \
	else \
		echo "   Creating new container..."; \
		docker rm -f happy-postgres > /dev/null 2>&1 || true; \
		docker run -d --name happy-postgres \
			-e POSTGRES_PASSWORD=postgres \
			-e POSTGRES_DB=handy \
			-v $(PWD)/.pgdata:/var/lib/postgresql/data \
			-p 5432:5432 \
			postgres > /dev/null && echo "   Created and started"; \
	fi

# Start Redis
redis:
	@echo "🔴 Starting Redis..."
	@if docker ps -q -f name=^happy-redis$$ | grep -q .; then \
		echo "   Already running"; \
	elif docker start happy-redis > /dev/null 2>&1; then \
		echo "   Started existing container"; \
	else \
		echo "   Creating new container..."; \
		docker rm -f happy-redis > /dev/null 2>&1 || true; \
		docker run -d --name happy-redis \
			-p 6379:6379 \
			redis > /dev/null && echo "   Created and started"; \
	fi

# Start MinIO (S3)
s3:
	@echo "📦 Starting MinIO..."
	@if docker ps -q -f name=^minio$$ | grep -q .; then \
		echo "   Already running"; \
	elif docker start minio > /dev/null 2>&1; then \
		echo "   Started existing container"; \
	else \
		echo "   Creating new container..."; \
		docker rm -f minio > /dev/null 2>&1 || true; \
		docker run -d --name minio \
			-p 9000:9000 -p 9001:9001 \
			-e MINIO_ROOT_USER=minioadmin \
			-e MINIO_ROOT_PASSWORD=minioadmin \
			-v $(PWD)/.minio/data:/data \
			minio/minio server /data --console-address :9001 > /dev/null && echo "   Created and started"; \
	fi

# Generate Prisma client
generate:
	@echo "🔧 Generating Prisma client..."
	@yarn generate

# Run migrations
migrate:
	@echo "🗃️ Running migrations..."
	@yarn migrate

# Start dev server
dev:
	@echo "🚀 Starting server..."
	@yarn dev

# Stop all services (keeps containers)
stop:
	@echo "🛑 Stopping services..."
	@docker stop happy-postgres happy-redis minio 2>/dev/null || true

# Stop and remove containers
down:
	@echo "🛑 Stopping and removing containers..."
	@docker stop happy-postgres happy-redis minio 2>/dev/null || true
	@docker rm happy-postgres happy-redis minio 2>/dev/null || true

# Clean everything (including data)
clean: down
	@echo "🧹 Cleaning up..."
	@rm -rf .pgdata .minio node_modules

# Show status
status:
	@echo "📊 Service status:"
	@docker ps --filter name=happy-postgres --filter name=happy-redis --filter name=minio --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Help
help:
	@echo "Available commands:"
	@echo "  make start   - Full setup and start server (recommended)"
	@echo "  make setup   - Install deps, start services, run migrations"
	@echo "  make dev     - Start dev server only"
	@echo "  make stop    - Stop Docker services (keeps containers)"
	@echo "  make down    - Stop and remove Docker containers"
	@echo "  make clean   - Remove everything (containers, data, node_modules)"
	@echo "  make status  - Show Docker service status"
