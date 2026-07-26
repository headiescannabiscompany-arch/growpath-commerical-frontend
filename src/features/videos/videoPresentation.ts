import { PLAN_LIMITS } from "@/config/planLimits";

export function formatBytes(value: unknown) {
  const bytes = Math.max(0, Number(value || 0));
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(bytes >= 10 * 1024 ** 3 ? 0 : 1)} GB`;
  }
  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(bytes >= 10 * 1024 ** 2 ? 0 : 1)} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round(bytes)} B`;
}

export function videoStorageFallback(plan: string | null | undefined) {
  const key = String(plan || "free").toLowerCase() as keyof typeof PLAN_LIMITS;
  return (PLAN_LIMITS[key] || PLAN_LIMITS.free).videoStorageBytes;
}

export function formatDuration(value: unknown) {
  const total = Math.max(0, Math.round(Number(value || 0)));
  if (!total) return "";
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours)
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
