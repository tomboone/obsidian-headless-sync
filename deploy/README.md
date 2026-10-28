# Running obsidian-worklog

Pushing to `main` publishes `ghcr.io/tomboone/obsidian-worklog` (tags `latest` and `sha-<7>`) via
GitHub Actions. This directory is all a host needs: `docker-compose.yml` runs the image, and a
Watchtower scoped to `obsidian-worklog` rolls out each new `latest` within 5 minutes.

Every command below runs in this `deploy/` directory.

## Setup

1. **Fetch the deploy files**

   ```sh
   git clone --filter=blob:none --sparse --branch main https://github.com/tomboone/obsidian-worklog.git ~/obsidian-worklog
   cd ~/obsidian-worklog
   git sparse-checkout set deploy
   cd deploy
   ```

2. **Config and secrets**

   ```sh
   cp .env.example .env            # tokens, TZ, PUID/PGID
   chmod 600 .env
   cp config.example.json config.json
   mkdir -p data/vault data/config
   docker network create kuma-push 2>/dev/null || true   # the worker joins it; see KUMA_PUSH_URL
   ```

   In `config.json`, `context` is the default for each account or workspace. `owners` (GitHub
   org/user) and `teams` (Linear team key) override it, e.g. `"owners": {"acme-corp": "work"}`.
   Add more entries to the `github` or `linear` arrays for separate accounts or workspaces.

3. **Get the image and log in to Obsidian** (interactive, once; enter your 2FA code when prompted)

   The package must be public, since Watchtower pulls anonymously.

   ```sh
   docker compose pull
   docker compose run --rm sync ob login
   docker compose run --rm sync ob sync-list-remote
   docker compose run --rm sync ob sync-setup --vault "Your Vault" --path /vault --device-name kumadrome
   docker compose run --rm sync ob sync-config --path /vault --configs "" --file-types ""
   ```

   The last command stops this device from syncing app settings and attachments it doesn't need.
   For an end-to-end encrypted vault, `sync-setup` prompts for the vault password.

4. **Dry run the fetchers** (prints files instead of writing them)

   ```sh
   docker compose run --rm -e DRY_RUN=1 worker node /app/src/run.mjs
   ```

5. **Start it**

   ```sh
   docker compose config -q && docker compose up -d
   docker compose logs -f
   ```

## Updates and rollback

Watchtower pulls a new `latest` and restarts `sync` and `worker` on its own. To roll back, change
`image:` in `docker-compose.yml` to a `sha-<7>` tag and run `docker compose up -d`; run
`git restore docker-compose.yml` before the next `git pull`.

## Dry run without a host

From the repo root, after creating `deploy/.env` and `deploy/config.json`:

```sh
docker build -t obsidian-worklog:local .
docker run --rm --env-file deploy/.env -e DRY_RUN=1 \
  -v "$PWD/deploy/config.json:/app/config.json:ro" obsidian-worklog:local node /app/src/run.mjs
```
