import fs from "node:fs/promises";
import path from "node:path";
import { dayRange } from "./dates.mjs";
import { pushStatus } from "./push.mjs";
import { render } from "./render.mjs";
import { fetchGitHub } from "./sources/github.mjs";
import { fetchLinear } from "./sources/linear.mjs";

const VAULT = process.env.VAULT_PATH ?? "/vault";
const CONFIG = process.env.CONFIG_PATH ?? "/app/config.json";
const DAYS_BACK = Number(process.env.DAYS_BACK ?? 1);
const DRY_RUN = process.env.DRY_RUN === "1";

const config = JSON.parse(await fs.readFile(CONFIG, "utf8"));

const jobs = [
  ...(config.github ?? []).map((a) => (range) => fetchGitHub(a, range)),
  ...(config.linear ?? []).map((w) => (range) => fetchLinear(w, range)),
];

async function writeIfChanged(file, content) {
  const existing = await fs.readFile(file, "utf8").catch(() => null);
  if (existing === content) return false;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
  return true;
}

let firstFailure = null;

for (let offset = DAYS_BACK; offset >= 0; offset--) {
  const range = dayRange(offset);
  const results = await Promise.allSettled(jobs.map((job) => job(range)));
  const failures = results.filter((r) => r.status === "rejected");
  for (const f of failures) console.error(`[${range.ymd}] ${f.reason?.message ?? f.reason}`);
  if (failures.length) {
    firstFailure ??= `${range.ymd}: ${failures[0].reason?.message ?? failures[0].reason}`;
    // Never overwrite a day's log with partial data.
    console.error(`[${range.ymd}] skipped: a source failed, existing files left untouched`);
    continue;
  }

  const events = results.flatMap((r) => r.value);
  const contexts = [...new Set([...config.contexts, ...events.map((e) => e.context)])];
  for (const context of contexts) {
    const content = render(range.ymd, context, events.filter((e) => e.context === context));
    const file = path.join(VAULT, config.logFolder ?? "log", range.year, `${range.ymd} ${context}.md`);
    if (DRY_RUN) { console.log(`--- ${file}\n${content}`); continue; }
    if (await writeIfChanged(file, content)) console.log(`[${range.ymd}] updated ${path.relative(VAULT, file)}`);
  }
}

if (!DRY_RUN) {
  if (firstFailure) await pushStatus(process.env.KUMA_PUSH_URL, "down", firstFailure);
  else await pushStatus(process.env.KUMA_PUSH_URL, "up", "OK");
}
// Non-zero so loop.sh logs "run failed" when a day was skipped.
if (firstFailure) process.exitCode = 1;
