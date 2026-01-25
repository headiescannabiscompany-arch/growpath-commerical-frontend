// src/features/feed/utils/feedFormat.ts
export function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  return date.toLocaleString();
}
