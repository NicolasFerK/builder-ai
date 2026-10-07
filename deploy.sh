#!/bin/bash
set -e

PROJECT="/workspace/BuilderAI"
BRANCH="main"
CONFIG="$PROJECT/server/config.json"
BACKUP="/workspace/config.json.deploy-backup"

cd "$PROJECT"

git fetch origin "$BRANCH"

if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/$BRANCH)" ]; then
    cp "$CONFIG" "$BACKUP"
    git reset --hard "origin/$BRANCH"
    cp "$BACKUP" "$CONFIG"
    pnpm install
    pnpm run build
fi

if [ "$1" = "nodeploy" ]; then
    echo "Deploy desativado."
    exit 0
fi

while true; do
    sleep 10
    git fetch origin "$BRANCH"

    if [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/$BRANCH)" ]; then
        echo "Novo commit detectado. Fazendo deploy..."
        cp "$CONFIG" "$BACKUP"
        git reset --hard "origin/$BRANCH"
        cp "$BACKUP" "$CONFIG"
        pnpm install
        pnpm run build
        echo "Deploy concluído."
    fi
done
