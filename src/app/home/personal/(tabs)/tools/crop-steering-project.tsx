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
      subtitle="Track steering intent, phase, dryback, runoff EC, plant response, warnings, and pheno notes."
      fields={[
        { key: "steeringIntent", label: "Steering intent", defaultValue: "balanced" },
        { key: "phase", label: "Phase P0/P1/P2/P3", defaultValue: "P1" },
        {
          key: "drybackPercent",
          label: "Dryback %",
          defaultValue: "25",
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
        { key: "plantResponse", label: "Plant response", defaultValue: "normal turgor" }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        ...values
      })}
      buildMetrics={(outputs) => [
        { key: "intent", label: "Intent", value: outputs.steeringIntent },
        { key: "phase", label: "Phase", value: outputs.phase },
        { key: "warnings", label: "Warnings", value: outputs.warnings?.length || 0 },
        { key: "pheno", label: "Pheno note", value: outputs.notesForPhenoScore }
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
