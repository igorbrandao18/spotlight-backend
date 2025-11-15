#!/bin/bash

# Script para parar o ambiente Docker

set -e

echo "🛑 Stopping Spotlight Backend Docker Environment..."

read -p "Do you want to remove volumes? (this will delete all data) [y/N]: " remove_volumes

if [[ $remove_volumes =~ ^[Yy]$ ]]; then
    echo "⚠️  Removing containers and volumes..."
    docker-compose down -v
    docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down -v 2>/dev/null || true
    echo "✅ Containers and volumes removed"
else
    echo "Stopping containers (keeping volumes)..."
    docker-compose down 2>/dev/null || true
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    echo "✅ Containers stopped"
fi

