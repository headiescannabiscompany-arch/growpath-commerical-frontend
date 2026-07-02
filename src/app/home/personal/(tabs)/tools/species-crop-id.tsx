import React from "react";

import BackendCalculatorToolScreen from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function SpeciesCropIdToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="species-crop-id"
      toolKey="species-crop-id"
      title="Species / Crop Identification"
      subtitle="Create a crop identity suggestion that must be user-confirmed before crop-specific recommendations."
      fields={[
        { key: "commonName", label: "Crop common name", defaultValue: "Cannabis" },
        { key: "cultivar", label: "Cultivar / strain", defaultValue: "" },
        { key: "traits", label: "Traits or evidence, comma-separated", defaultValue: "", multiline: true },
        { key: "userConfirmed", label: "User confirmed true/false", defaultValue: "false" }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({ growId, ...plantContext.toolRunContext, ...values })}
      buildMetrics={(outputs) => [
        { key: "crop", label: "Likely crop", value: outputs.likelyCrop },
        { key: "cultivar", label: "Cultivar", value: outputs.cultivarOrStrain },
        { key: "confidence", label: "Confidence", value: outputs.confidence },
        { key: "confirm", label: "Confirm needed", value: outputs.confirmationRequired ? "Yes" : "No" }
      ]}
      defaultLogTitle={(outputs) => `Crop identity: ${outputs.likelyCrop || "unknown"}`}
    />
  );
}
