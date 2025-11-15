#!/bin/bash

# Script para iniciar o ambiente Docker

set -e

echo "🐳 Starting Spotlight Backend Docker Environment..."

# Verifica se o Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Verifica se o arquivo .env existe
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file. Please edit it with your configuration."
fi

# Pergunta qual ambiente usar
echo ""
echo "Select environment:"
echo "1) Development (with API in container)"
echo "2) Development (services only, API local)"
echo "3) Production"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo "🚀 Starting development environment (full stack)..."
        docker-compose up -d --build
        echo ""
        echo "⏳ Waiting for services to be ready..."
        sleep 10
        echo ""
        echo "✅ Services started!"
        echo ""
        echo "📊 Service URLs:"
        echo "  - API: http://localhost:8080/api"
        echo "  - MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)"
        echo "  - MailDev: http://localhost:1080"
        echo "  - PostgreSQL: localhost:5432"
        echo "  - Redis: localhost:6379"
        echo ""
        echo "📝 Next steps:"
        echo "  1. Run migrations: docker-compose exec api npx prisma migrate deploy"
        echo "  2. View logs: docker-compose logs -f api"
        ;;
    2)
        echo "🚀 Starting development services only..."
        docker-compose -f docker-compose.dev.yml up -d
        echo ""
        echo "⏳ Waiting for services to be ready..."
        sleep 10
        echo ""
        echo "✅ Services started!"
        echo ""
        echo "📊 Service URLs:"
        echo "  - MinIO Console: http://localhost:9001 (minioadmin/minioadmin123)"
        echo "  - MailDev: http://localhost:1080"
        echo "  - PostgreSQL: localhost:5432"
        echo "  - Redis: localhost:6379"
        echo ""
        echo "📝 Next steps:"
        echo "  1. Install dependencies: npm install"
        echo "  2. Generate Prisma client: npm run prisma:generate"
        echo "  3. Run migrations: npm run prisma:migrate"
        echo "  4. Start API: npm run start:dev"
        ;;
    3)
        echo "🚀 Starting production environment..."
        if [ ! -f .env.prod ]; then
            echo "❌ .env.prod file not found. Please create it with production values."
            exit 1
        fi
        docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
        echo ""
        echo "✅ Production environment started!"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📋 To view logs: docker-compose logs -f"
echo "📋 To stop: docker-compose down"

