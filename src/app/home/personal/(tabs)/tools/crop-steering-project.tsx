import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function CropSteeringProjectToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="crop-steering-project"
      toolKey="crop-steering-project"
      title="Crop Steering Projects"
      subtitle="Track vegetative/generative intent, root-zone behavior, dryback, light, VPD, EC, pH, recovery, and pheno impact."
      fields={[
        { key: "steeringIntent", label: "Goal", defaultValue: "generative" },
        { key: "stage", label: "Stage", defaultValue: "mid flower" },
        { key: "phase", label: "Phase P0/P1/P2/P3", defaultValue: "P1" },
        {
          key: "drybackPercent",
          label: "Dryback %",
          defaultValue: "25",
          keyboardType: "numeric"
        },
        {
          key: "irrigationTiming",
          label: "Irrigation timing",
          defaultValue: "controlled morning shot, runoff checked"
        },
        {
          key: "dli",
          label: "DLI",
          defaultValue: "38",
          keyboardType: "numeric"
        },
        {
          key: "vpd",
          label: "VPD",
          defaultValue: "1.25",
          keyboardType: "numeric"
        },
        {
          key: "inputEC",
          label: "Input EC",
          defaultValue: "1.4",
          keyboardType: "numeric"
        },
        {
          key: "runoffEC",
          label: "Runoff EC",
          defaultValue: "1.7",
          keyboardType: "numeric"
        },
        {
          key: "inputPH",
          label: "Input pH",
          defaultValue: "6.3",
          keyboardType: "numeric"
        },
        {
          key: "runoffPH",
          label: "Runoff pH",
          defaultValue: "6.6",
          keyboardType: "numeric"
        },
        { key: "recipeUsed", label: "Recipe used", defaultValue: "balanced flower feed" },
        { key: "kLevel", label: "K level / note", defaultValue: "moderate" },
        { key: "caMgResponse", label: "Ca/Mg response", defaultValue: "stable" },
        {
          key: "rootZoneCondition",
          label: "Root-zone condition",
          defaultValue: "even moisture"
        },
        {
          key: "recoveryHours",
          label: "Recovery hours",
          defaultValue: "12",
          keyboardType: "numeric"
        },
        {
          key: "plantResponse",
          label: "Plant response",
          defaultValue: "turgor recovered by next light cycle",
          multiline: true
        },
        {
          key: "lightChange",
          label: "Recent light change",
          defaultValue: "stable"
        },
        {
          key: "notes",
          label: "Tip burn, clawing, dark green, Mg/Ca symptoms, photos",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        ...values
      })}
      buildMetrics={(outputs) => [
        { key: "intent", label: "Intent", value: outputs.steeringIntent },
        { key: "outcome", label: "Outcome", value: outputs.steeringOutcome },
        { key: "pressure", label: "Pressure", value: outputs.pressureLevel },
        { key: "response", label: "Response", value: outputs.plantResponse },
        { key: "recovery", label: "Recovery", value: outputs.recoveryStatus },
        { key: "phase", label: "Phase", value: outputs.phase },
        { key: "warnings", label: "Warnings", value: outputs.warnings?.length || 0 },
        {
          key: "pheno",
          label: "Pheno note",
          value: outputs.phenoImpact || outputs.notesForPhenoScore
        }
      ]}
      defaultLogTitle={(outputs) => `Crop steering: ${outputs.phase || "phase"}`}
      defaultTask={(outputs) => ({
        title: outputs.tasksToCreate?.[0]?.title || "Log crop steering response",
        priority: outputs.tasksToCreate?.[0]?.priority || "medium",
        dueDate: tomorrow(outputs.tasksToCreate?.[0]?.dueInDays || 1),
        description: "Record plant response, dryback, EC, runoff, and comparison notes."
      })}
    />
  );
}
