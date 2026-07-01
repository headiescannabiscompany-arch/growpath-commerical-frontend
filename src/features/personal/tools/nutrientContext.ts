import type { ToolResultNotice } from "./ToolResultSurface";

function confirmationStatus(context: any) {
  return String(
    context?.growthProfile?.confirmationStatus || context?.confirmationStatus || ""
  ).toLowerCase();
}

export function nutrientContextState(selectedPlantContext: any) {
  if (!selectedPlantContext) {
    return {
      state: "missing" as const,
      label: "No crop context selected",
      message:
        "Nutrient math is generic. Select and confirm a plant/crop profile before treating targets as crop-specific."
    };
  }
  const confirmed =
    Boolean(selectedPlantContext.cropProfileId) ||
    ["user_confirmed", "reviewed"].includes(confirmationStatus(selectedPlantContext));
  const crop =
    selectedPlantContext.cropCommonName ||
    selectedPlantContext.scientificName ||
    selectedPlantContext.name ||
    "selected plant";
  if (!confirmed) {
    return {
      state: "unconfirmed" as const,
      label: "Crop context needs confirmation",
      message: `${crop} is selected, but species/crop profile confirmation is missing. Treat nutrient interpretation as generic until confirmed.`
    };
  }
  return {
    state: "confirmed" as const,
    label: "Crop context included",
    message: `Nutrient workflow includes selected crop context: ${crop}.`
  };
}

export function buildNutrientContextNotices(
  selectedPlantContext: any
): ToolResultNotice[] {
  const state = nutrientContextState(selectedPlantContext);
  return [
    {
      key: `nutrient-crop-context-${state.state}`,
      severity: state.state === "confirmed" ? "info" : "medium",
      message: state.message
    }
  ];
}

export function buildNutrientContextAssumption(selectedPlantContext: any) {
  const state = nutrientContextState(selectedPlantContext);
  return state.state === "confirmed"
    ? "Crop context is saved with the nutrient result, but crop-specific nutrient targets still require reviewed source data."
    : "Crop-specific nutrient interpretation is not confirmed; verify crop profile, medium, water, and measured EC/pH before applying.";
}
