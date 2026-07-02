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
        { key: "feedingResponse", label: "Feeding response", defaultValue: "unknown" },
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
        {
          key: "signals",
          label: "Keeper signals",
          value: outputs.keeperSignals?.length || 0
        }
      ]}
      defaultLogTitle={(outputs) => `Genetics record: ${outputs.cultivar || "cultivar"}`}
    />
  );
}
