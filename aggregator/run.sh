#!/bin/sh

DEBUG="False"

SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
cd "$SCRIPT_DIR"

# Delete log files older than 1 day
find ./logs -type f -mtime +1 -exec rm {} \;

if [ "$DEBUG" = "True" ]; then
    nohup .venv/bin/python aggregator.py > ./logs/nohup.out 2>&1 &
else
    nohup .venv/bin/python aggregator.py > /dev/null 2>&1 &
fi

