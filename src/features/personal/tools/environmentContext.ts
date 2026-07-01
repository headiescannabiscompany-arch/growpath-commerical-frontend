import type { ToolResultNotice } from "./ToolResultSurface";

function statusFromContext(context: any) {
  return String(
    context?.growthProfile?.confirmationStatus ||
      context?.confirmationStatus ||
      context?.cropIdentity?.confirmationStatus ||
      ""
  ).toLowerCase();
}

export function buildEnvironmentContextNotices(
  selectedPlantContext: any
): ToolResultNotice[] {
  if (!selectedPlantContext) {
    return [
      {
        key: "crop-context-missing",
        severity: "medium",
        message:
          "No plant/crop context is selected. Environment analysis should be treated as generic controlled-environment guidance."
      }
    ];
  }
  const confirmed =
    Boolean(selectedPlantContext.cropProfileId) ||
    statusFromContext(selectedPlantContext) === "user_confirmed" ||
    statusFromContext(selectedPlantContext) === "reviewed";
  if (!confirmed) {
    return [
      {
        key: "crop-context-unconfirmed",
        severity: "medium",
        message:
          "Selected crop identity is not confirmed. Confirm species/crop profile before applying crop-specific environment targets."
      }
    ];
  }
  return [
    {
      key: "crop-context-confirmed",
      severity: "info",
      message: `Environment analysis includes selected crop context: ${
        selectedPlantContext.cropCommonName ||
        selectedPlantContext.scientificName ||
        selectedPlantContext.name ||
        "selected plant"
      }.`
    }
  ];
}

export function buildEnvironmentContextAssumption(selectedPlantContext: any) {
  if (!selectedPlantContext) {
    return "No crop profile was selected; do not treat targets as species-verified.";
  }
  const crop = [
    selectedPlantContext.cropCommonName || selectedPlantContext.scientificName,
    selectedPlantContext.cultivarOrStrain
  ]
    .filter(Boolean)
    .join(" / ");
  return crop
    ? `Selected crop context sent to the environment endpoint: ${crop}.`
    : "Selected plant context was sent to the environment endpoint.";
}
