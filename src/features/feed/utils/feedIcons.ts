// src/features/feed/utils/feedIcons.ts
// Map feed item types to icon names or components
export function getFeedIcon(type: string): string {
  switch (type) {
    case "task":
      return "📝";
    case "alert":
      return "⚠️";
    case "log":
      return "📒";
    case "event":
      return "📅";
    case "compliance":
      return "✅";
    case "note":
      return "🗒️";
    default:
      return "🔔";
  }
}
