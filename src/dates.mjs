// Day boundaries in local time (the container's TZ).
const pad = (n) => String(n).padStart(2, "0");

export function dayRange(offsetDays = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetDays);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  return {
    ymd: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    year: String(start.getFullYear()),
    from: start.toISOString(),
    to: end.toISOString(),
    inRange: (iso) => { const t = new Date(iso); return t >= start && t < end; },
  };
}

// GitHub search wants second precision, no milliseconds.
export const searchStamp = (iso) => iso.replace(/\.\d{3}Z$/, "Z");
