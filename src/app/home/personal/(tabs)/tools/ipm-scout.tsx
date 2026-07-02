import React from "react";

import BackendCalculatorToolScreen, { tomorrow } from "@/features/personal/tools/BackendCalculatorToolScreen";

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
        { key: "undersideInspection", label: "Underside inspection", defaultValue: "checked with loupe" },
        { key: "stickyTrapCount", label: "Sticky trap count", defaultValue: "4", keyboardType: "numeric" },
        { key: "evidence", label: "Evidence / notes, comma-separated", defaultValue: "", multiline: true }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({ growId, ...plantContext.toolRunContext, ...values })}
      buildMetrics={(outputs) => [
        { key: "issue", label: "Issue", value: outputs.suspectedIssue },
        { key: "organism", label: "Organism", value: outputs.suspectedOrganism },
        { key: "severity", label: "Severity", value: outputs.severity },
        { key: "confidence", label: "Confidence", value: outputs.confidence }
      ]}
      defaultLogTitle={(outputs) => `IPM scout: ${outputs.suspectedIssue || "inspection"}`}
      defaultTask={(outputs) => ({
        title: outputs.taskSuggestions?.[0]?.title || "Repeat IPM scout",
        priority: outputs.taskSuggestions?.[0]?.priority || "medium",
        dueDate: tomorrow(outputs.taskSuggestions?.[0]?.dueInDays || 3),
        description: "Repeat inspection, trap count, and photo evidence before treatment decisions."
      })}
    />
  );
}
