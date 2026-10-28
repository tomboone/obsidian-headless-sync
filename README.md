# obsidian-worklog

Logs your daily GitHub and Linear activity into an Obsidian Sync vault, split by context
(work, hobby, personal). Two containers share the vault directory:

- **sync** runs `ob sync --continuous` (the official Obsidian headless client), so the vault
  stays in step with your other devices through Obsidian Sync.
- **worker** queries GitHub and Linear every hour and writes one file per day per context,
  e.g. `log/2026/2026-10-28 work.md`.

Everything is outbound traffic, so no ports, reverse proxy, or tailnet sidecar are needed.
It runs on kumadrome from the published image; [deploy/README.md](deploy/README.md) is the
runbook for deploying, operating, and rolling it back.

## Contexts

`config.json` lists the Contexts, and every Context gets an Activity log each day, even an
empty one ("_Nothing logged._"). Each Source (a GitHub account or Linear workspace) has a
default `context`; `owners` (GitHub org or user) and `teams` (Linear team key) send matching
activity elsewhere, e.g. `"owners": {"acme-corp": "work"}`. Add entries to the `github` or
`linear` arrays for more Sources. `deploy/config.example.json` is a starting point.

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
- If `KUMA_PUSH_URL` is set, each run pushes `up` to that Uptime Kuma push monitor, or `down` with
  the first failure when a day was skipped (and the run exits non-zero).
- Treat `log/` as machine-owned. Edits there are overwritten on the next run, so put your
  thoughts in the daily note instead.
- GitHub commits appear as per-repo counts (from your contribution graph), which keeps busy days
  readable. GitHub only counts commits that land on a default branch or `gh-pages`.
- Linear logs issues you created, status changes you made (collapsed to first → last state), and
  issues you commented on, limited to issues assigned to or created by you.

## Notes

- `obsidian-headless` is pinned to 0.0.14 in the Dockerfile because it's pre-1.0; bump deliberately.
- The GitHub and Linear queries were tested against mocked responses, not live APIs. The dry run
  in [deploy/README.md](deploy/README.md) (step 5) is the first real check.
