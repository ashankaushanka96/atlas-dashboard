#!/bin/bash
script_path=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$script_path"

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Try to detect which compose command is available
if command -v docker-compose &>/dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &>/dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "Error: docker-compose or docker compose not found in PATH"
    exit 1
fi

$COMPOSE_CMD pull frontend backend aggregator   
$COMPOSE_CMD up -d