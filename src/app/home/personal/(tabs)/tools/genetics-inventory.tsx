import React from "react";

import BackendCalculatorToolScreen from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function GeneticsInventoryToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="genetics-inventory"
      toolKey="genetics-inventory"
      title="Genetics Inventory"
      subtitle="Record cultivar, parentage, feeding response, stress notes, flower timing, and keeper signals."
      fields={[
        { key: "cultivar", label: "Cultivar", defaultValue: "Unnamed cultivar" },
        { key: "breeder", label: "Breeder / source", defaultValue: "" },
        { key: "parentage", label: "Parentage", defaultValue: "" },
        { key: "seedType", label: "Seed type", defaultValue: "regular" },
        { key: "materialType", label: "Material type", defaultValue: "seed" },
        { key: "feedingResponse", label: "Feeding response", defaultValue: "unknown" },
        { key: "rootingBehavior", label: "Rooting behavior", defaultValue: "unknown" },
        {
          key: "flowerTime",
          label: "Flower time days",
          defaultValue: "63",
          keyboardType: "numeric"
        },
        {
          key: "stressNotes",
          label: "Stress notes, comma-separated",
          defaultValue: "",
          multiline: true
        },
        {
          key: "aromaFlavorNotes",
          label: "Aroma/flavor notes, comma-separated",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId }) => ({ growId, ...values })}
      buildMetrics={(outputs) => [
        { key: "cultivar", label: "Cultivar", value: outputs.cultivar },
        { key: "breeder", label: "Breeder", value: outputs.breeder },
        { key: "flower", label: "Flower time", value: outputs.flowerTime },
        { key: "material", label: "Material", value: outputs.materialType },
        {
          key: "tags",
          label: "Tags",
          value: outputs.tags?.length || 0
        },
        {
          key: "signals",
          label: "Keeper signals",
          value: outputs.keeperSignals?.length || 0
        }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.parentageWarnings)
          ? outputs.parentageWarnings.map((message: string, index: number) => ({
              key: `parentage-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(Array.isArray(outputs.preservationRecommendations)
          ? outputs.preservationRecommendations.slice(0, 1).map((message: string, index: number) => ({
              key: `preservation-${index}`,
              severity: "info" as const,
              message
            }))
          : [])
      ]}
      defaultLogTitle={(outputs) => `Genetics record: ${outputs.cultivar || "cultivar"}`}
    />
  );
}
