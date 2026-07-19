import React, { useState } from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import type { EvidenceAsset } from "@/types/evidence";
import { createFacilityTask } from "@/api/facilityTasks";

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
  const calendarMetadata = {
    allDay: true,
    calendarType: "ipm_scout_followup",
    sourceStage: "ipm_inspection",
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
  if (planned.length > 1) {
    return planned.slice(0, 8).map((task: any, index: number) => ({
      title: String(task?.title || `IPM follow-up ${index + 1}`),
      priority: normalizePriority(task?.priority),
      dueDate: tomorrow(Number(task?.dueInDays || index + 1)),
      ...calendarMetadata,
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
      ...calendarMetadata,
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
      ...calendarMetadata,
      sourceStage: "ipm_treatment_decision",
      description:
        "Save leaf top/bottom photos, trap counts, affected plant locations, treatment decision, product/rate if used, and safety notes."
    },
    {
      title: "Review IPM outcome",
      priority: "medium" as const,
      dueDate: tomorrow(7),
      ...calendarMetadata,
      sourceStage: "ipm_outcome_review",
      description:
        "Record whether the response worked, whether pest pressure changed, and whether another scout or escalation is needed."
    }
  ];
}

export default function IpmScoutToolRoute() {
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  return (
    <BackendCalculatorToolScreen
      tool="ipm-scout"
      toolKey="ipm-scout"
      title="IPM Scout"
      subtitle="Record pest, disease, organism, trap, leaf damage, and inspection notes with follow-up tasks."
      aiPrefill={{
        buttonLabel: "Fill IPM scout from grow and media",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        buildMessage: () =>
          `Prefill the IPM Scout from the selected grow and plant's crop identity, stage, environment, recent logs, prior IPM records, diagnoses, and attached photos/videos. Return JSON only with exactly these keys: {"pestSeen":"string","leafDamage":"string","undersideInspection":"string","stickyTrapCount":"string","evidence":"string","additionalInformation":"string"}. Separate direct observations from hypotheses. Do not claim an organism is seen unless it is visibly supported; otherwise say "not confirmed". Do not invent trap counts or an underside inspection. In evidence list concise observed facts. Leave unknown fields blank. In additionalInformation request the exact missing leaf-top, leaf-underside, macro, sticky-trap, whole-plant, or video evidence needed and note plausible alternatives.`
      }}
      formHeader={({ growId, facilityId }) => (
        <MediaEvidencePicker
          maxPhotos={10}
          allowVideo
          maxVideoSeconds={30}
          purpose="ipm"
          sourceContext={{
            growId: growId || undefined,
            facilityId: facilityId || undefined
          }}
          value={evidenceAssets}
          onChange={setEvidenceAssets}
        />
      )}
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
        },
        {
          key: "additionalInformation",
          label: "Additional IPM context or questions (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(
        values,
        { growId, facilityId, commercialAccountId, plantContext }
      ) => ({
        growId,
        facilityId: facilityId || undefined,
        commercialAccountId: commercialAccountId || undefined,
        ...plantContext.toolRunContext,
        ...values,
        evidenceAssetIds: providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        mediaEvidence: providerEvidencePayload(evidenceAssets).media
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
            ? `${outputs.gptVerification.providerLabel || "Verification"}; status: ${outputs.gptVerification.status}`
            : "Separate verification result"
        },
        {
          key: "agreement",
          label: "Agreement status",
          value: outputs.gptVerification?.agreementStatus || "not_run",
          detail:
            outputs.gptVerification?.agreementStatus === "conflict"
              ? "GrowPath and GPT candidates differ; inspect the evidence and next checks before acting."
              : "Comparison of the structured GrowPath result and GPT media review."
        },
        {
          key: "media",
          label: "Media reviewed",
          value: `${outputs.mediaAnalysis?.photosAnalyzed || 0} photos; ${outputs.mediaAnalysis?.videosAnalyzed || 0} videos`,
          detail: outputs.mediaAnalysis?.videoStatus || "No video attached"
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
          : []),
        ...(Array.isArray(outputs.gptVerification?.counterEvidence) &&
        outputs.gptVerification.counterEvidence.length
          ? [
              {
                key: "counter-evidence",
                severity: "info" as const,
                message: `Counter-evidence: ${outputs.gptVerification.counterEvidence.join("; ")}`
              }
            ]
          : []),
        ...(Array.isArray(outputs.gptVerification?.missingInformation) &&
        outputs.gptVerification.missingInformation.length
          ? [
              {
                key: "missing-information",
                severity: "medium" as const,
                message: `Missing information: ${outputs.gptVerification.missingInformation.join("; ")}`
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
        allDay: true,
        calendarType: "ipm_scout_followup",
        sourceStage: "ipm_inspection",
        reminderPlan: {
          channels: ["in_app"],
          reminders: [{ offsetMinutes: -12 * 60 }]
        },
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
          disabled: !growId && !payload.facilityId,
          successMessage: "Created IPM tasks.",
          onPress: async () => {
            const tasks = ipmTaskPlan(outputs);
            if (payload.facilityId) {
              await Promise.all(
                tasks.map((task) =>
                  createFacilityTask(payload.facilityId, {
                    title: task.title,
                    description: [
                      task.description,
                      `Source ToolRun: ${toolRun?.id || toolRun?._id || "pending"}`
                    ]
                      .filter(Boolean)
                      .join("\n"),
                    priority: task.priority === "medium" ? "normal" : task.priority,
                    dueAt: task.dueDate
                      ? new Date(`${task.dueDate}T12:00:00.000Z`).toISOString()
                      : undefined
                  })
                )
              );
              return;
            }
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "ipm-scout",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}
