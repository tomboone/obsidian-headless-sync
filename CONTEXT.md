# obsidian-worklog

Records a person's daily GitHub and Linear activity as Markdown files in an Obsidian Sync vault, split by the part of life the work belongs to.

## Language

**Worklog**:
The app as a whole, and the set of activity logs it keeps in the vault.
_Avoid_: obsidian-headless-sync (the repo's old name)

**Context**:
The part of life a piece of activity belongs to, such as work, hobby or personal. Each Activity log belongs to exactly one.
_Avoid_: category, bucket, area

**Activity log**:
The generated file for one day and one Context, e.g. `log/2026/2026-10-28 work.md`. Machine-owned: the next Run overwrites it.
_Avoid_: log file, daily log

**Daily note**:
The person's own hand-written note for a day, made from the vault template. Never written by the Worklog.
_Avoid_: journal, diary

**Source**:
One account or workspace the Worklog reads activity from, either a GitHub account or a Linear workspace.
_Avoid_: integration, provider, connector

**Run**:
One pass that fetches today and the previous few days from every Source and rewrites any changed Activity logs. A day with a failed Source is skipped whole.
_Avoid_: sync (that is the vault's Obsidian Sync), job, refresh

**Vault sync**:
Obsidian Sync keeping the vault on the server in step with the person's other devices. Separate from Runs.
_Avoid_: sync on its own
