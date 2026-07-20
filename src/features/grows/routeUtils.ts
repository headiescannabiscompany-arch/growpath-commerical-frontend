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

const CANNABIS_WORKFLOW_IDS = new Set([
  "harvest-readiness",
  "dry-cure-guard",
  "pheno-hunt",
  "pheno-matrix"
]);

function normalizedWorkflowId(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-");
}

export function hasCannabisWorkflowEvidence(toolRuns: readonly any[] = []): boolean {
  return toolRuns.some((run) =>
    [run?.toolName, run?.toolType, run?.toolKey].some((value) =>
      CANNABIS_WORKFLOW_IDS.has(normalizedWorkflowId(value))
    )
  );
}

export function isCannabisGrow(
  grow: PersonalGrow | null | undefined,
  toolRuns: readonly any[] = []
): boolean {
  if (hasCannabisWorkflowEvidence(toolRuns)) return true;
  if (!grow) return false;
  const interests = Object.values(grow.growInterests || {}).flat();
  const labels = [
    ...(Array.isArray(grow.growTags) ? grow.growTags : []),
    ...(Array.isArray(grow.cropTypes) ? grow.cropTypes : []),
    ...interests
  ];
  if (labels.some((label) => String(label).toLowerCase().includes("cannabis"))) {
    return true;
  }

  const hasStructuredContext = [
    ...labels,
    ...(Array.isArray(grow.environmentTypes) ? grow.environmentTypes : []),
    ...(Array.isArray(grow.growingMethods) ? grow.growingMethods : [])
  ].some((label) => String(label || "").trim());
  if (hasStructuredContext) return false;

  // Personal grows created before multi-crop tagging used strain/cultivar as their
  // cannabis context. Preserve those records without guessing from the grow name.
  return Boolean(String(grow.strain || grow.cultivar || "").trim());
}

export function fmtDate(input?: string) {
  if (!input) return "n/a";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  return d.toLocaleDateString();
}
