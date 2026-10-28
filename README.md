# obsidian-worklog

Logs your daily GitHub and Linear activity into an Obsidian Sync vault, split by context
(work, hobby, personal). Two containers share the vault directory:

- **sync** runs `ob sync --continuous` (the official Obsidian headless client), so the vault
  stays in step with your other devices through Obsidian Sync.
- **worker** queries GitHub and Linear every hour and writes one file per day per context,
  e.g. `log/2026/2026-10-28 work.md`.

Everything is outbound traffic, so no ports, reverse proxy, or tailnet sidecar are needed.

## Setup

1. **Config and secrets**

   ```sh
   cp .env.example .env            # tokens, TZ, PUID/PGID
   cp config.example.json config.json
   mkdir -p data/vault data/config
   ```

   In `config.json`, `context` is the default for each account or workspace. `owners` (GitHub
   org/user) and `teams` (Linear team key) override it, e.g. `"owners": {"acme-corp": "work"}`.
   Add more entries to the `github` or `linear` arrays for separate accounts or workspaces.

2. **Get the image and log in to Obsidian** (interactive, once; enter your 2FA code when prompted)

   Pushing to `main` builds `ghcr.io/tomboone/obsidian-worklog` via GitHub Actions. To use
   a different image, set `IMAGE=` in `.env`. If the package is private,
   run `docker login ghcr.io` on the mini with a PAT that has `read:packages`.

   ```sh
   docker compose pull             # or: IMAGE=obsidian-worklog:local docker compose build
   docker compose run --rm sync ob login
   docker compose run --rm sync ob sync-list-remote
   docker compose run --rm sync ob sync-setup --vault "Your Vault" --path /vault --device-name mac-mini
   docker compose run --rm sync ob sync-config --path /vault --configs "" --file-types ""
   ```

   The last command stops this device from syncing app settings and attachments it doesn't need.
   For an end-to-end encrypted vault, `sync-setup` prompts for the vault password.

3. **Dry run the fetchers** (prints files instead of writing them)

   ```sh
   docker compose run --rm -e DRY_RUN=1 worker node /app/src/run.mjs
   ```

4. **Start it**

   ```sh
   docker compose up -d
   docker compose logs -f
   ```

   To update later: `docker compose pull && docker compose up -d`.

## In Obsidian

1. Copy `vault-template/Daily.md` into your vault's templates folder.
2. Enable the **Daily notes** core plugin, set its template to that file, and keep the date
   format at `YYYY-MM-DD` (it must match the log file names).
3. Write your own notes under each heading. Fold a heading to hide that context for the day.

The generated files carry `date` and `context` properties, so a Bases view (or Dataview) over
the `log` folder can show, say, all work activity for a week.

## Behavior

- Each run re-checks today and the previous `DAYS_BACK` days, so late activity is caught.
- Files are rewritten only when their content changes, to avoid needless sync churn.
- If any source fails, that day is skipped and existing files are left alone, so a bad token or
  an API outage never replaces a day's log with partial data.
- Treat `log/` as machine-owned. Edits there are overwritten on the next run, so put your
  thoughts in the daily note instead.
- GitHub commits appear as per-repo counts (from your contribution graph), which keeps busy days
  readable. GitHub only counts commits that land on a default branch or `gh-pages`.
- Linear logs issues you created, status changes you made (collapsed to first → last state), and
  issues you commented on, limited to issues assigned to or created by you.

## Notes

- `obsidian-headless` is pinned to 0.0.14 in the Dockerfile because it's pre-1.0; bump deliberately.
- The GitHub and Linear queries were tested against mocked responses, not live APIs. The dry run
  in step 3 is the first real check; send me any errors it prints.
