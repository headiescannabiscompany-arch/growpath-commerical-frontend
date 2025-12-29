export function getCreatorName(creator, fallback = "Unknown") {
  if (!creator || typeof creator !== "object") {
    return fallback;
  }
  return (
    creator.name ||
    creator.displayName ||
    creator.username ||
    fallback
  );
}
