const SOURCE_ORDER = ["GitHub", "Linear"];

export function render(ymd, context, events) {
  const lines = ["---", `date: ${ymd}`, `context: ${context}`, "generated: true", "---", ""];
  const sources = [...new Set(events.map((e) => e.source))]
    .sort((a, b) => SOURCE_ORDER.indexOf(a) - SOURCE_ORDER.indexOf(b));
  if (!sources.length) lines.push("_Nothing logged._", "");
  for (const source of sources) {
    lines.push(`### ${source}`);
    for (const e of events.filter((e) => e.source === source)) lines.push(`- ${e.text}`);
    lines.push("");
  }
  return lines.join("\n");
}
