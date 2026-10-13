#!/bin/bash
set -euo pipefail

if [ "$(id -u)" != 0 ]; then
    echo "Run this installer as root on the VPS." >&2
    exit 1
fi
source_dir=$(cd -- "$(dirname -- "$0")" && pwd)
bash -n "$source_dir/deploy-geoconverter.sh"
install -o root -g root -m 0755 "$source_dir/deploy-geoconverter.sh" \
    /usr/local/sbin/deploy-geoconverter

python3 - <<'PY'
from pathlib import Path
from datetime import datetime
import os
key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBtPmjRZMJojKljGAiczuk2nnu91WY7+OclUDVB8ffYS"
line = 'restrict,command="/usr/local/sbin/deploy-geoconverter" ' + key + " github-actions-geoconverter"
directory = Path("/root/.ssh")
directory.mkdir(mode=0o700, exist_ok=True)
path = directory / "authorized_keys"
text = path.read_text() if path.exists() else ""
if path.exists():
    backup = directory / ("authorized_keys.before-geoconverter-" + datetime.now().strftime("%Y%m%d-%H%M%S"))
    backup.write_bytes(path.read_bytes())
    os.chmod(backup, 0o600)
# Replace only entries for this key; preserve every other login key.
lines = [entry for entry in text.splitlines() if key.split()[1] not in entry.split()]
lines.append(line)
path.write_text("\n".join(lines) + "\n")
os.chmod(path, 0o600)
print("Restricted deployment key installed.")
PY

SSH_ORIGINAL_COMMAND=check /usr/local/sbin/deploy-geoconverter
