export type WorkspaceToolMode = "personal" | "commercial" | "facility";

function normalizedMode(mode: unknown): WorkspaceToolMode | "" {
  const value = String(mode || "")
    .trim()
    .toLowerCase();
  return value === "personal" || value === "commercial" || value === "facility"
    ? value
    : "";
}

export function plantIdentificationDestination(mode: unknown) {
  switch (normalizedMode(mode)) {
    case "personal":
      return "/home/personal/tools/species-crop-id";
    case "commercial":
      return "/home/commercial/tools/species-crop-id?workspace=commercial";
    case "facility":
      return "/home/facility/tools/species-crop-id?workspace=facility";
    default:
      return "/account/mode";
  }
}

export function plantIdentificationActionLabel(mode: unknown) {
  return normalizedMode(mode) ? "Identify a Plant" : "Choose a workspace for Plant ID";
}
