const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

// Dates in the public ledger are calendar dates, not timestamps. UTC day numbers
// prevent daylight-saving days from becoming 23/25-hour elapsed-day errors.
export function releaseDay(value: string): number | null {
  const match = /^(\w+) (\d{1,2}), (\d{4})$/.exec(value);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 0 || year < 2000) return null;
  const date = new Date(Date.UTC(year, month, day));
  return date.getUTCMonth() === month && date.getUTCDate() === day
    ? date.getTime() / 86400000
    : null;
}

export function releaseAgeLabel(date: string, now = new Date()): string | null {
  const released = releaseDay(date);
  if (released === null || !Number.isFinite(now.getTime())) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
  const days = today - released;
  if (days < 0) return null;
  return days === 0
    ? "Released today · 0 days ago"
    : `Released ${days} ${days === 1 ? "day" : "days"} ago`;
}
