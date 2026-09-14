#!/bin/bash
script_path=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$script_path"

# Try to detect which compose command is available
if command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "Error: docker-compose or docker compose not found in PATH"
    exit 1
fi

$COMPOSE_CMD down