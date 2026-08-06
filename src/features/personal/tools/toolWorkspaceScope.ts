export type ToolWorkspaceType = "personal" | "commercial" | "facility";

function normalizedWorkspaceType(value: unknown): ToolWorkspaceType | "" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "personal" ||
    normalized === "commercial" ||
    normalized === "facility"
    ? normalized
    : "";
}

export function resolveToolWorkspaceType({
  entitlementMode,
  requestedWorkspaceType,
  facilityId,
  commercialAccountId
}: {
  entitlementMode?: unknown;
  requestedWorkspaceType?: unknown;
  facilityId?: unknown;
  commercialAccountId?: unknown;
}): ToolWorkspaceType {
  const authenticatedMode = normalizedWorkspaceType(entitlementMode);
  const requestedMode = normalizedWorkspaceType(requestedWorkspaceType);
  const facilitySignal =
    Boolean(String(facilityId || "").trim()) || requestedMode === "facility";
  const commercialSignal =
    Boolean(String(commercialAccountId || "").trim()) || requestedMode === "commercial";

  // Once the authenticated account is in a shared mode, mutable URL parameters
  // cannot downgrade it to Personal or switch it into the other shared workspace.
  if (authenticatedMode === "facility" || authenticatedMode === "commercial") {
    return authenticatedMode;
  }
  if (facilitySignal && commercialSignal) {
    // Conflicting unauthenticated signals fail closed into Facility, whose backend
    // contract additionally requires an authorized facility id.
    return "facility";
  }
  if (facilitySignal) return "facility";
  if (commercialSignal) return "commercial";
  return "personal";
}

export function toolWorkspaceIdentity({
  workspaceType,
  facilityId,
  commercialAccountId
}: {
  workspaceType: ToolWorkspaceType;
  facilityId?: unknown;
  commercialAccountId?: unknown;
}) {
  return [
    workspaceType,
    workspaceType === "facility" ? String(facilityId || "").trim() : "",
    workspaceType === "commercial" ? String(commercialAccountId || "").trim() : ""
  ].join(":");
}
