// Keep titles from breaking Markdown link syntax.
export const esc = (s = "") => s.replace(/([\[\]|])/g, "\\$1").replace(/\s+/g, " ").trim();
export const link = (label, url) => `[${esc(label)}](${url})`;
