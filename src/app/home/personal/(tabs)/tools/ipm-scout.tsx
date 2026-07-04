import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

export default function IpmScoutToolRoute() {
  return (
    <BackendCalculatorToolScreen
      tool="ipm-scout"
      toolKey="ipm-scout"
      title="IPM Scout"
      subtitle="Record pest, disease, organism, trap, leaf damage, and inspection notes with follow-up tasks."
      fields={[
        { key: "pestSeen", label: "Pest or organism seen", defaultValue: "none" },
        { key: "leafDamage", label: "Leaf damage pattern", defaultValue: "stippling" },
        {
          key: "undersideInspection",
          label: "Underside inspection",
          defaultValue: "checked with loupe"
        },
        {
          key: "stickyTrapCount",
          label: "Sticky trap count",
          defaultValue: "4",
          keyboardType: "numeric"
        },
        {
          key: "evidence",
          label: "Evidence / notes, comma-separated",
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
        { key: "issue", label: "Issue", value: outputs.suspectedIssue },
        { key: "organism", label: "Organism", value: outputs.suspectedOrganism },
        { key: "severity", label: "Severity", value: outputs.severity },
        { key: "confidence", label: "Confidence", value: outputs.confidence },
        {
          key: "verification",
          label: "GPT check",
          value: outputs.gptVerification?.status || "pending"
        },
        {
          key: "record",
          label: "Saved as",
          value: outputs.documentation?.savedAs || "ToolRun"
        }
      ]}
      buildNotices={(outputs) => [
        ...(Array.isArray(outputs.warnings)
          ? outputs.warnings.map((message: string, index: number) => ({
              key: `warning-${index}`,
              severity: "medium" as const,
              message
            }))
          : []),
        ...(outputs.gptVerification?.status
          ? [
              {
                key: "gpt-verification",
                severity: "info" as const,
                message: `GPT verification status: ${outputs.gptVerification.status}. Save this ToolRun so the GrowPathAI scout answer and GPT review can be documented together.`
              }
            ]
          : [])
      ]}
      defaultLogTitle={(outputs) =>
        `IPM scout: ${outputs.suspectedIssue || "inspection"}`
      }
      defaultTask={(outputs) => ({
        title: outputs.taskSuggestions?.[0]?.title || "Repeat IPM scout",
        priority: outputs.taskSuggestions?.[0]?.priority || "medium",
        dueDate: tomorrow(outputs.taskSuggestions?.[0]?.dueInDays || 3),
        description:
          "Repeat inspection, trap count, and photo evidence before treatment decisions."
      })}
    />
  );
}
