import { esc, link } from "../md.mjs";

const QUERY = `
query($from: DateTimeOrDuration!, $to: DateTimeOrDuration!) {
  viewer { id }
  issues(first: 100, filter: {
    updatedAt: { gte: $from }
    or: [{ assignee: { isMe: { eq: true } } }, { creator: { isMe: { eq: true } } }]
  }) {
    nodes {
      identifier title url createdAt
      creator { id }
      team { key }
      history(first: 50) {
        nodes { createdAt actor { id } fromState { name } toState { name } }
      }
    }
  }
  comments(first: 100, filter: { user: { isMe: { eq: true } }, createdAt: { gte: $from, lt: $to } }) {
    nodes { issue { identifier title url team { key } } }
  }
}`;

export async function fetchLinear(workspace, range) {
  const key = process.env[workspace.tokenEnv];
  if (!key) throw new Error(`Linear "${workspace.name}": ${workspace.tokenEnv} is not set`);

  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: key, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { from: range.from, to: range.to } }),
  });
  if (!res.ok) throw new Error(`Linear "${workspace.name}": HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length || !json.data) {
    throw new Error(`Linear "${workspace.name}": ${JSON.stringify(json.errors)}`);
  }

  const me = json.data.viewer.id;
  const ctx = (issue) => workspace.teams?.[issue.team.key] ?? workspace.context;
  const label = (i) => `${link(i.identifier, i.url)} ${esc(i.title)}`;
  const events = [];
  const add = (issue, text) => events.push({ source: "Linear", context: ctx(issue), text });

  for (const issue of json.data.issues.nodes) {
    if (issue.creator?.id === me && range.inRange(issue.createdAt)) add(issue, `Created ${label(issue)}`);

    // Collapse the day's status changes by me into "first → last".
    const moves = issue.history.nodes
      .filter((h) => h.toState && h.actor?.id === me && range.inRange(h.createdAt))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (moves.length) {
      const from = moves[0].fromState?.name ?? "—";
      const to = moves.at(-1).toState.name;
      add(issue, `${label(issue)}: ${from} → ${to}`);
    }
  }

  const commented = new Map();
  for (const { issue } of json.data.comments.nodes) {
    if (!issue) continue; // comments on project updates, docs, etc.
    const entry = commented.get(issue.url) ?? { issue, n: 0 };
    entry.n++;
    commented.set(issue.url, entry);
  }
  for (const { issue, n } of commented.values()) {
    add(issue, `Commented on ${label(issue)}${n > 1 ? ` (${n}×)` : ""}`);
  }
  return events;
}
