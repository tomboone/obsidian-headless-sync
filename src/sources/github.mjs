import { searchStamp } from "../dates.mjs";
import { esc, link } from "../md.mjs";

const QUERY = `
query($from: DateTime!, $to: DateTime!, $merged: String!) {
  viewer {
    contributionsCollection(from: $from, to: $to) {
      commitContributionsByRepository(maxRepositories: 100) {
        repository { nameWithOwner url owner { login } }
        contributions { totalCount }
      }
      pullRequestContributions(first: 100) {
        nodes { pullRequest { number title url repository { nameWithOwner owner { login } } } }
      }
      pullRequestReviewContributions(first: 100) {
        nodes {
          pullRequestReview { state }
          pullRequest { number title url repository { nameWithOwner owner { login } } }
        }
      }
      issueContributions(first: 100) {
        nodes { issue { number title url repository { nameWithOwner owner { login } } } }
      }
    }
  }
  merged: search(type: ISSUE, query: $merged, first: 100) {
    nodes { ... on PullRequest { number title url repository { nameWithOwner owner { login } } } }
  }
}`;

const REVIEW_VERB = {
  APPROVED: "Approved",
  CHANGES_REQUESTED: "Requested changes on",
  COMMENTED: "Reviewed",
  DISMISSED: "Reviewed",
};

export async function fetchGitHub(account, range) {
  const token = process.env[account.tokenEnv];
  if (!token) throw new Error(`GitHub "${account.name}": ${account.tokenEnv} is not set`);

  const merged = `is:pr author:@me is:merged merged:${searchStamp(range.from)}..${searchStamp(range.to)}`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "obsidian-worklog",
    },
    body: JSON.stringify({ query: QUERY, variables: { from: range.from, to: range.to, merged } }),
  });
  if (!res.ok) throw new Error(`GitHub "${account.name}": HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  if (!json.data) throw new Error(`GitHub "${account.name}": ${JSON.stringify(json.errors)}`);
  // Partial errors usually mean an SSO-protected org the token isn't authorized for.
  for (const e of json.errors ?? []) console.warn(`GitHub "${account.name}" warning: ${e.message}`);

  const ctx = (repo) => account.owners?.[repo.owner.login] ?? account.context;
  const prLabel = (pr) => `${pr.repository.nameWithOwner}#${pr.number}`;
  const c = json.data.viewer.contributionsCollection;
  const events = [];
  const add = (repo, text) => events.push({ source: "GitHub", context: ctx(repo), text });

  for (const { repository: r, contributions } of c.commitContributionsByRepository) {
    const n = contributions.totalCount;
    add(r, `${link(r.nameWithOwner, r.url)}: ${n} commit${n === 1 ? "" : "s"}`);
  }
  for (const { pullRequest: pr } of c.pullRequestContributions.nodes) {
    add(pr.repository, `Opened ${link(prLabel(pr), pr.url)} ${esc(pr.title)}`);
  }
  for (const pr of json.data.merged.nodes.filter((n) => n?.url)) {
    add(pr.repository, `Merged ${link(prLabel(pr), pr.url)} ${esc(pr.title)}`);
  }
  const seenReviews = new Set();
  for (const { pullRequestReview: rv, pullRequest: pr } of c.pullRequestReviewContributions.nodes) {
    const key = `${pr.url}|${rv.state}`;
    if (seenReviews.has(key)) continue;
    seenReviews.add(key);
    add(pr.repository, `${REVIEW_VERB[rv.state] ?? "Reviewed"} ${link(prLabel(pr), pr.url)} ${esc(pr.title)}`);
  }
  for (const { issue } of c.issueContributions.nodes) {
    add(issue.repository, `Opened issue ${link(prLabel(issue), issue.url)} ${esc(issue.title)}`);
  }
  return events;
}
