import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

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

function normalizePriority(
  value: unknown,
  fallback: "low" | "medium" | "high" = "medium"
) {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function ipmTaskPlan(outputs: Record<string, any>) {
  const planned = Array.isArray(outputs.taskSuggestions) ? outputs.taskSuggestions : [];
  if (planned.length > 1) {
    return planned.slice(0, 8).map((task: any, index: number) => ({
      title: String(task?.title || `IPM follow-up ${index + 1}`),
      priority: normalizePriority(task?.priority),
      dueDate: tomorrow(Number(task?.dueInDays || index + 1)),
      description:
        task?.description ||
        "Follow up on IPM scout evidence, verification context, inspection steps, and treatment outcome."
    }));
  }

  const highSeverity = ["high", "urgent", "critical"].includes(
    String(outputs.severity || "").toLowerCase()
  );
  const verification = verificationAnswer(outputs.gptVerification);
  const growPath = growPathAnswer(outputs);
  const issue = outputs.suspectedIssue || "IPM issue";
  const organism =
    outputs.suspectedOrganism || outputs.suspectedPest || "unknown organism";

  return [
    {
      title: outputs.taskSuggestions?.[0]?.title || "Repeat IPM scout",
      priority: normalizePriority(
        outputs.taskSuggestions?.[0]?.priority,
        highSeverity ? "high" : "medium"
      ),
      dueDate: tomorrow(outputs.taskSuggestions?.[0]?.dueInDays || 3),
      description: [
        `Suspected issue: ${issue}.`,
        `Suspected organism: ${organism}.`,
        growPath ? `GrowPath AI: ${growPath}` : "",
        verification
          ? `GPT verification: ${verification}`
          : outputs.gptVerification?.status
            ? `GPT verification status: ${outputs.gptVerification.status}.`
            : "",
        "Repeat underside inspection, trap count, and photo evidence before treatment decisions."
      ]
        .filter(Boolean)
        .join(" ")
    },
    {
      title: "Document IPM evidence and treatment decision",
      priority: highSeverity ? "high" : ("medium" as const),
      dueDate: tomorrow(4),
      description:
        "Save leaf top/bottom photos, trap counts, affected plant locations, treatment decision, product/rate if used, and safety notes."
    },
    {
      title: "Review IPM outcome",
      priority: "medium" as const,
      dueDate: tomorrow(7),
      description:
        "Record whether the response worked, whether pest pressure changed, and whether another scout or escalation is needed."
    }
  ];
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
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-ipm-task-plan",
          label: "Create IPM Task Plan",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created IPM tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "ipm-scout",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: ipmTaskPlan(outputs)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
