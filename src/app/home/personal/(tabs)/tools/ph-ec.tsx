import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

function n(value: string, fallback?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function PhEcToolScreen() {
  return (
    <BackendCalculatorToolScreen
      tool="ph-ec-check"
      toolKey="ph-ec-check"
      title="pH / EC Range Check"
      subtitle="Compare input and runoff pH/EC against medium and stage ranges without pretending to dose pH up/down."
      fields={[
        { key: "medium", label: "Medium", defaultValue: "soil" },
        { key: "stage", label: "Stage", defaultValue: "flower" },
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
        {
          key: "inputEC",
          label: "Input EC",
          defaultValue: "1.4",
          keyboardType: "numeric"
        },
        {
          key: "runoffEC",
          label: "Runoff EC",
          defaultValue: "2.1",
          keyboardType: "numeric"
        },
        { key: "ecUnit", label: "EC unit", defaultValue: "mS/cm" },
        { key: "waterSource", label: "Water source", defaultValue: "unknown" }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        medium: values.medium,
        stage: values.stage,
        inputPH: n(values.inputPH),
        runoffPH: n(values.runoffPH),
        inputEC: n(values.inputEC),
        runoffEC: n(values.runoffEC),
        ecUnit: values.ecUnit,
        waterSource: values.waterSource
      })}
      buildMetrics={(outputs) => [
        { key: "input-ph", label: "Input pH", value: outputs.phStatus || "-" },
        { key: "runoff-ph", label: "Runoff pH", value: outputs.runoffPHStatus || "-" },
        { key: "input-ec", label: "Input EC", value: outputs.ecStatus || "-" },
        { key: "runoff-ec", label: "Runoff EC", value: outputs.runoffECStatus || "-" },
        { key: "drift", label: "Drift", value: outputs.driftDirection || "-" }
      ]}
      defaultLogTitle={() => "pH / EC range check"}
      defaultTask={(outputs) => ({
        title: outputs.retestTaskSuggestion?.title || "Retest pH / EC",
        description: Array.isArray(outputs.warnings)
          ? outputs.warnings.join(" ")
          : "Retest pH and EC.",
        priority: outputs.retestTaskSuggestion?.priority || "medium",
        dueDate: tomorrow(outputs.retestTaskSuggestion?.dueInDays || 1)
      })}
    />
  );
}
