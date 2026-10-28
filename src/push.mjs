// Reports a Run's outcome to an Uptime Kuma push monitor. A failed push is logged and never
// changes the Run's outcome, so this resolves in every case.
export async function pushStatus(url, status, msg) {
  if (!url) return;
  try {
    // Truncate by code point: slicing UTF-16 units can leave a lone surrogate, which
    // encodeURIComponent rejects.
    const text = [...msg].slice(0, 200).join("");
    const res = await fetch(`${url}?status=${status}&msg=${encodeURIComponent(text)}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`kuma push failed: HTTP ${res.status}`);
  } catch (err) {
    console.error(`kuma push failed: ${err.message ?? err}`);
  }
}
