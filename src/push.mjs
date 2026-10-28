// Reports a Run's outcome to an Uptime Kuma push monitor. A failed push is logged and never
// changes the Run's outcome, so this resolves in every case.
export async function pushStatus(url, status, msg) {
  if (!url) return;
  const target = `${url}?status=${status}&msg=${encodeURIComponent(msg.slice(0, 200))}`;
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) console.error(`kuma push failed: HTTP ${res.status}`);
  } catch (err) {
    console.error(`kuma push failed: ${err.message ?? err}`);
  }
}
