import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function verificationAnswer(verification: any) {
  return firstText(
    verification?.answer,
    verification?.summary,
    verification?.finding,
    verification?.result,
    verification?.message
  );
}

function growPathAnswer(outputs: any) {
  return firstText(
    outputs.growPathAi?.answer,
    outputs.growPathAI?.answer,
    outputs.growpathAI?.answer,
    outputs.growPathDiagnosis,
    outputs.aiDiagnosis,
    outputs.diagnosis,
    outputs.summary,
    outputs.suspectedIssue
  );
}

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
          key: "growpath-ai-answer",
          label: "GrowPath AI",
          value: growPathAnswer(outputs) || "-",
          detail: "Primary scout answer"
        },
        {
          key: "verification",
          label: "GPT verification",
          value: verificationAnswer(outputs.gptVerification) || "pending",
          detail: outputs.gptVerification?.status
            ? `Status: ${outputs.gptVerification.status}`
            : "Separate verification result"
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
                message: [
                  `GPT verification status: ${outputs.gptVerification.status}.`,
                  verificationAnswer(outputs.gptVerification)
                    ? `GPT review: ${verificationAnswer(outputs.gptVerification)}`
                    : "",
                  "Save this ToolRun so the GrowPath AI scout answer and GPT review can be documented together."
                ]
                  .filter(Boolean)
                  .join(" ")
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
        description: [
          `Suspected issue: ${outputs.suspectedIssue || "unknown"}.`,
          outputs.suspectedOrganism
            ? `Suspected organism: ${outputs.suspectedOrganism}.`
            : "",
          growPathAnswer(outputs) ? `GrowPath AI: ${growPathAnswer(outputs)}` : "",
          verificationAnswer(outputs.gptVerification)
            ? `GPT verification: ${verificationAnswer(outputs.gptVerification)}`
            : outputs.gptVerification?.status
              ? `GPT verification status: ${outputs.gptVerification.status}.`
              : "",
          "Repeat underside inspection, trap count, and photo evidence before treatment decisions. Record whether the response worked after the follow-up."
        ]
          .filter(Boolean)
          .join(" ")
      })}
    />
  );
}
