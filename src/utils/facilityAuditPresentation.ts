const INTERNAL_ID_PATTERNS = [
  /\b[a-f\d]{24}\b/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i
];

export function formatFacilityAuditAction(action: unknown) {
  const normalized = String(action || "Audit event")
    .trim()
    .replace(/[_-]+/g, " ")
    .toLowerCase();
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase());
}

function includesInternalId(value: string) {
  return INTERNAL_ID_PATTERNS.some((pattern) => pattern.test(value));
}

function countSummary(
  record: Record<string, unknown>,
  field: string,
  singular: string,
  plural: string,
  verb: string
) {
  const values = Array.isArray(record[field]) ? record[field].filter(Boolean) : [];
  if (!values.length) return "";
  return `${values.length} ${values.length === 1 ? singular : plural} ${verb}.`;
}

export function formatFacilityAuditDetails(action: unknown, details: unknown) {
  let parsed = details;
  if (typeof details === "string") {
    const trimmed = details.trim();
    if (!trimmed) return "";
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return includesInternalId(trimmed)
        ? "Open the full audit log for recorded details."
        : trimmed;
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return parsed ? String(parsed) : "";
  }

  const record = parsed as Record<string, unknown>;
  const normalizedAction = String(action || "").toUpperCase();
  if (normalizedAction.includes("REORDER")) {
    const roomSummary = countSummary(record, "roomIds", "room", "rooms", "reordered");
    if (roomSummary) return roomSummary;
  }

  const parts: string[] = [];
  const title = String(record.title || record.name || "").trim();
  const status = String(record.status || record.state || "").trim();
  const role = String(record.role || "").trim();
  if (title) parts.push(title);
  if (status) parts.push(`Status: ${formatFacilityAuditAction(status)}`);
  if (role) parts.push(`Role: ${formatFacilityAuditAction(role)}`);
  if (parts.length) return parts.join(" | ");

  return (
    countSummary(record, "roomIds", "room", "rooms", "affected") ||
    countSummary(record, "taskIds", "task", "tasks", "affected") ||
    countSummary(record, "memberIds", "team member", "team members", "affected") ||
    "Open the full audit log for recorded details."
  );
}

export function formatFacilityAuditTimestamp(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
}
