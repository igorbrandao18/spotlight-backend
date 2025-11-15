#!/bin/bash

# Script para visualizar logs dos containers

SERVICE=${1:-api}

echo "📋 Viewing logs for: $SERVICE"
echo "Press Ctrl+C to exit"
echo ""

docker-compose logs -f $SERVICE

