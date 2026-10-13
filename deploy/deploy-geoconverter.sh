#!/bin/bash
set -Eeuo pipefail
umask 077

deployment_dir=/opt/hosting/geoconverter
request=${SSH_ORIGINAL_COMMAND:-}
candidate=
previous=
switched=false

if [ "$request" = check ]; then
    test -f "$deployment_dir/compose.yaml"
    test -f "$deployment_dir/.env"
    docker info > /dev/null
    echo "READY: GeoConverter deployment access works."
    exit 0
fi

if [[ ! "$request" =~ ^deploy\ ([a-f0-9]{40})$ ]]; then
    echo "Denied: expected 'check' or 'deploy <40-character commit SHA>'." >&2
    exit 64
fi
release_sha=${BASH_REMATCH[1]}

exec 9>/run/lock/geoconverter-deploy.lock
if ! flock -n 9; then
    echo "Another GeoConverter deployment is running." >&2
    exit 75
fi

compose() {
    docker compose --project-directory "$deployment_dir" \
        --env-file "$deployment_dir/.env" \
        -f "$deployment_dir/compose.yaml" "$@"
}

cleanup() {
    if [ -n "$candidate" ]; then
        rm -f -- "$candidate"
    fi
}

fail() {
    local status="$1"
    trap - ERR INT TERM HUP
    echo "Deployment failed (exit $status)." >&2
    if [ "$switched" = true ]; then
        compose logs --tail=60 backend frontend || true
        echo "Restoring previous GeoConverter images..." >&2
        if cp -p -- "$previous" "$deployment_dir/.env" &&
           compose up -d --no-build --pull never --wait --wait-timeout 180; then
            echo "Previous containers restored." >&2
        else
            echo "ROLLBACK FAILED. Inspect GeoConverter containers manually." >&2
        fi
    else
        echo "Running containers and active image settings were not changed." >&2
    fi
    exit "$status"
}

trap cleanup EXIT
trap 'fail $?' ERR
trap 'fail 130' INT
trap 'fail 143' TERM
trap 'fail 129' HUP

test -f "$deployment_dir/compose.yaml"
test -f "$deployment_dir/.env"
install -m 0700 -d "$deployment_dir/releases"
candidate=$(mktemp "$deployment_dir/.env-next.XXXXXX")
cp -- "$deployment_dir/.env" "$candidate"

python3 - "$candidate" "$release_sha" <<'PY'
from pathlib import Path
import sys
p = Path(sys.argv[1])
sha = sys.argv[2]
values = {
    "BACKEND_IMAGE": f"ghcr.io/seredapavel/geoconverter-backend:sha-{sha}",
    "FRONTEND_IMAGE": f"ghcr.io/seredapavel/geoconverter-frontend:sha-{sha}",
}
lines = [line for line in p.read_text().splitlines()
         if not any(line.startswith(key + "=") for key in values)]
lines.extend(f"{key}={value}" for key, value in values.items())
p.write_text("\n".join(lines) + "\n")
PY

docker compose --project-directory "$deployment_dir" --env-file "$candidate" \
    -f "$deployment_dir/compose.yaml" config --quiet

echo "Downloading GeoConverter images for $release_sha..."
docker compose --project-directory "$deployment_dir" --env-file "$candidate" \
    -f "$deployment_dir/compose.yaml" pull --policy missing

previous="$deployment_dir/releases/$(date -u +%Y%m%dT%H%M%S)-before-$release_sha.env"
cp -p -- "$deployment_dir/.env" "$previous"
switched=true
mv -- "$candidate" "$deployment_dir/.env"
candidate=

compose up -d --no-build --pull never --wait --wait-timeout 180

curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
    --resolve geoconverter.ru:443:127.0.0.1 \
    https://geoconverter.ru/api/health |
    python3 -c 'import json, sys; assert json.load(sys.stdin)["status"] == "ok"'

curl --fail --silent --show-error --connect-timeout 5 --max-time 15 \
    --resolve geoconverter.ru:443:127.0.0.1 \
    https://geoconverter.ru/ > /dev/null

cp -p -- "$previous" "$deployment_dir/previous.env"
compose ps
echo "SUCCESS: GeoConverter deployed from $release_sha."
echo "Rollback settings saved in $deployment_dir/previous.env"
