import React from "react";

import BackendCalculatorToolScreen from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function SpeciesCropIdToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="species-crop-id"
      toolKey="species-crop-id"
      title="Species / Crop Identification"
      subtitle="Confirm crop identity for diagnosis, nutrient, environment, and IPM context without enabling invasive-species reporting."
      fields={[
        { key: "userEnteredName", label: "Plant or crop name", defaultValue: "Cannabis" },
        {
          key: "scientificName",
          label: "Scientific name, if known",
          defaultValue: "Cannabis sativa"
        },
        { key: "cultivar", label: "Cultivar / strain", defaultValue: "" },
        {
          key: "userConfirmed",
          label: "User confirmed species? true/false",
          defaultValue: "true"
        },
        {
          key: "commonNames",
          label: "Common names, comma-separated",
          defaultValue: "cannabis, hemp"
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        userEnteredName: values.userEnteredName,
        scientificName: values.scientificName,
        cultivar: values.cultivar,
        userConfirmed: String(values.userConfirmed).toLowerCase() === "true",
        commonNames: values.commonNames
      })}
      buildMetrics={(outputs) => [
        { key: "crop", label: "Likely crop", value: outputs.likelyCrop },
        { key: "scientific", label: "Scientific", value: outputs.scientificName || "-" },
        { key: "confidence", label: "Confidence", value: outputs.confidence },
        {
          key: "confirm",
          label: "Needs confirm",
          value: outputs.userConfirmationRequired ? "Yes" : "No"
        }
      ]}
      defaultLogTitle={(outputs) =>
        `Crop identity: ${outputs.likelyCrop || "unconfirmed crop"}`
      }
      defaultTask={(outputs) => ({
        title: outputs.userConfirmationRequired
          ? "Confirm crop identity"
          : "Review crop profile context",
        description:
          outputs.recommendationContext ||
          "Confirm species/crop profile before applying crop-specific guidance.",
        priority: outputs.userConfirmationRequired ? "high" : "medium"
      })}
    />
  );
}
