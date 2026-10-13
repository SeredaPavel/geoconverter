# Automated deployment

The build matrix publishes both images before the deployment job starts.
Pushes to main deploy automatically; a manual run on main deploys only when the
deploy checkbox is selected. dev and infra/ghcr-hosting only build images.
Workflow concurrency does not cancel an active release. The server also locks
deployments to prevent overlapping container updates.

Install deploy-geoconverter.sh and the restricted SSH key on the VPS by copying
both shell scripts to /root and running bash /root/install-actions-key.sh.
The installer preserves other authorized_keys entries and backs up that file.
Run SSH_ORIGINAL_COMMAND=check /usr/local/sbin/deploy-geoconverter to check access
without downloading images or changing containers.

Repository Actions secrets:

- GEOCONVERTER_VPS_HOST: 13.143.244.89
- GEOCONVERTER_VPS_SSH_KEY: the entire private deployment key, including headers
- GEOCONVERTER_VPS_KNOWN_HOSTS: the verified host key in known_hosts format

The SSH key permits only check or deploy followed by a full lowercase commit SHA.
No arbitrary shell command, file copying, PTY or port forwarding is allowed.
Registry authentication remains in root's existing Docker configuration on the VPS.

The server downloads images before changing active settings. It saves the previous
.env, starts containers with healthchecks, and checks frontend and API through the
local Caddy HTTPS endpoint with certificate verification. Failure after switching
image settings triggers container rollback. Failed rollback is reported explicitly.
Successful deployments save rollback settings to previous.env and retain the old
images. No Caddy settings or upload files are modified by the deploy script.

Deployment changes image versions only. Changes to production Compose, the server
script or Caddy must be installed separately on the VPS before using them.

The server pull token expires according to its GitHub setting. Update it with
docker login when necessary; existing containers keep running when a token expires.
