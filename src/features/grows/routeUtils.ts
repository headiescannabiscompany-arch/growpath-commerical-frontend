import type { PersonalGrow } from "@/api/grows";

export function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

export function getRowId(row: any): string {
  return String(row?._id || row?.id || "");
}

export function findGrowById(grows: PersonalGrow[], growId: string): PersonalGrow | null {
  for (const grow of grows) {
    if (getRowId(grow) === growId) return grow;
  }
  return null;
}

export function isCannabisGrow(grow: PersonalGrow | null | undefined): boolean {
  if (!grow) return false;
  const interests = Object.values(grow.growInterests || {}).flat();
  const labels = [
    ...(Array.isArray(grow.growTags) ? grow.growTags : []),
    ...(Array.isArray(grow.cropTypes) ? grow.cropTypes : []),
    ...interests
  ];
  return labels.some((label) => String(label).toLowerCase().includes("cannabis"));
}

export function fmtDate(input?: string) {
  if (!input) return "n/a";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString();
}
