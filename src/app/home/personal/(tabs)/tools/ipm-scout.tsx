import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import {
  saveToolRunAndCreateTasks,
  type LinkedTaskDraft
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import SavedGrowPhotoEvidencePicker from "@/components/media/SavedGrowPhotoEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import type { EvidenceAsset } from "@/types/evidence";
import { createFacilityTask } from "@/api/facilityTasks";
import {
  updateGrowpathModuleRecord,
  type GrowpathModuleRecord,
  type GrowpathModuleUserDecision
} from "@/api/growpathModules";
import { updateToolRun, type ToolRun } from "@/api/toolRuns";

export function normalizeIpmPrefillField({
  fieldKey,
  value
}: {
  fieldKey: string;
  value: unknown;
}) {
  if (fieldKey === "evidence" && Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
  }

  // These are scout measurements, not facts that can be inferred from a photo.
  if (["plantsChecked", "plantsAffected", "stickyTrapCount"].includes(fieldKey)) {
    return "";
  }

  const text = String(value ?? "").trim();
  const isUnknownPlaceholder =
    /^(?:unknown|unavailable|n\/?a|not\s+(?:applicable|assessed|confirmed|determined|documented|known|observed|performed|provided|used|visible)|none\s+(?:documented|observed|provided))$/i.test(
      text
    );
  if (fieldKey !== "pestSeen" && isUnknownPlaceholder) return "";
  return undefined;
}

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
    outputs.primaryAnswer?.answer,
    outputs.primaryAnswer?.interpretation,
    outputs.suspectedIssue
  );
}

async function recordIpmDecision({
  decision,
  outputs,
  toolRun,
  moduleRecord
}: {
  decision: GrowpathModuleUserDecision;
  outputs: Record<string, any>;
  toolRun: ToolRun | null;
  moduleRecord: GrowpathModuleRecord | null;
}) {
  const recordedAt = new Date().toISOString();
  const decisionRecord = {
    value: decision,
    recordedAt,
    meaning:
      decision === "accepted"
        ? "The user marked this as the most likely working hypothesis, not a confirmed organism identification."
        : decision === "rejected"
          ? "The user marked this result as inconsistent with later observations."
          : "The user needs more evidence before choosing a working hypothesis."
  };
  const nextOutputs = { ...outputs, userDecision: decisionRecord };
  const toolRunId = String(toolRun?.id || toolRun?._id || "");
  const moduleRecordId = String(moduleRecord?.id || moduleRecord?._id || "");
  let saved = false;

  if (toolRunId) {
    const updatedRun = await updateToolRun(toolRunId, {
      outputs: nextOutputs,
      output: nextOutputs,
      result: nextOutputs
    });
    saved = Boolean(updatedRun);
  }

  if (moduleRecordId) {
    const updatedRecord = await updateGrowpathModuleRecord(moduleRecordId, {
      title: moduleRecord?.title || "IPM scout",
      status: moduleRecord?.status || "active",
      userDecision: decision,
      outcome: {
        ...(moduleRecord?.outcome || {}),
        lastDecision: decision,
        decisionRecordedAt: recordedAt
      },
      warnings: moduleRecord?.warnings || [],
      recommendations: moduleRecord?.recommendations || [],
      limitations: moduleRecord?.limitations || [],
      tags: moduleRecord?.tags || [],
      linkedTaskIds: moduleRecord?.linkedTaskIds || [],
      tasksToCreate: moduleRecord?.tasksToCreate || []
    });
    saved = Boolean(updatedRecord) || saved;
  }

  if (!saved) throw new Error("Unable to save this IPM decision.");
}

function normalizePriority(
  value: unknown,
  fallback: "low" | "medium" | "high" = "medium"
) {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function ipmTaskPlan(outputs: Record<string, any>): LinkedTaskDraft[] {
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
      sourceStage: String(task?.sourceStage || `ipm_followup_${index + 1}`),
      description: [
        task?.description ||
          "Follow up on IPM scout evidence, verification context, inspection steps, and treatment outcome.",
        index === 0 && growPathAnswer(outputs)
          ? `GrowPath AI: ${growPathAnswer(outputs)}`
          : "",
        index === 0 && verificationAnswer(outputs.gptVerification)
          ? `GPT verification: ${verificationAnswer(outputs.gptVerification)}`
          : ""
      ]
        .filter(Boolean)
        .join(" ")
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
  const evidencePayload = providerEvidencePayload(evidenceAssets);
  return (
    <BackendCalculatorToolScreen
      tool="ipm-scout"
      toolKey="ipm-scout"
      title="IPM Scout"
      status="CALCULATED + GPT REVIEW"
      runLabel="Analyze Scout + GPT Review (1 AI credit)"
      runAccessibilityLabel="Run IPM Scout and GPT review for 1 AI credit"
      experienceMessage="GrowPath calculates a local working hypothesis from the observations you review. The main action also runs a separate GPT structured second opinion against the same saved evidence."
      aiCreditMessage="Each provider-backed action is separate: photo prefill uses 1 AI credit, and Analyze Scout + GPT Review uses 1 AI credit. A failed provider call is refunded; the result shows the actual charge."
      subtitle="Build a repeatable pest and disease scout from direct observations, photos, trap counts, plant distribution, and follow-up checks—without pretending a pattern is a confirmed diagnosis."
      growOptional
      noGrowContextMessage="This scout is saved in Saved Runs. Attach a grow or facility to create linked logs, tasks, plant history, and outcome follow-ups."
      aiPrefill={{
        buttonLabel: "Analyze Photos & Prefill Scout",
        clearUnfilled: true,
        evidenceAssetIds: () => evidencePayload.evidenceAssetIds,
        isReady: () => evidencePayload.images.length > 0,
        notReadyMessage:
          "Upload at least one clear photo before asking AI to inspect the scout evidence. You can still complete the form manually.",
        buildMessage: () =>
          `Inspect the attached image pixels, then prefill a cautious ETGU/IPM scout using any selected private grow or plant context. Return JSON only with exactly these string keys: {"cropContext":"","scoutLocation":"","plantsChecked":"","plantsAffected":"","pestSeen":"","leafDamage":"","distribution":"","progression":"","undersideInspection":"","magnification":"","stickyTrapCount":"","trapContext":"","environmentConditions":"","recentActions":"","evidence":"","additionalInformation":"","imageAnalysisPerformed":"true or false","imageQuality":"usable, limited, or unusable","visualConfidence":"high, medium, or low"}. Separate observations from hypotheses. pestSeen may name an organism only when the pixels show defensible identifying traits; otherwise write "not confirmed". Never invent counts, progression, magnification, trap findings, environment, or prior actions. Leave every unknown value as an empty string; except for pestSeen, do not fill fields with placeholders such as "not determined", "not performed", "not provided", "not applicable", or "none documented". plantsChecked, plantsAffected, and stickyTrapCount must stay empty because a photo is not a completed scout count. evidence must list only visible or recorded facts. additionalInformation must name plausible alternatives and the exact leaf-top, leaf-underside, macro, whole-plant, root-zone, sticky-trap, or follow-up evidence that would discriminate among them. Do not recommend pesticide products or rates.`,
        normalizeFieldValue: normalizeIpmPrefillField,
        buildPayloadMetadata: ({ response, parsed, evidenceAssetIds }) => {
          const evidenceUsed = Array.isArray(response.evidenceUsed)
            ? response.evidenceUsed
            : [];
          const limitations = Array.isArray(response.limitations)
            ? response.limitations
            : [];
          const reportsNoVision = limitations.some((item) =>
            /text[- ]only|cannot (inspect|analyze|view)|image pixels? (were )?not|visual analysis (was )?not/i.test(
              String(item)
            )
          );
          const photosAnalyzed = Number(response.mediaAnalysis?.photosAnalyzed || 0);
          return {
            imageAnalysis: {
              requested: evidenceAssetIds.length > 0,
              performed:
                evidenceAssetIds.length > 0 &&
                evidenceUsed.length > 0 &&
                photosAnalyzed > 0 &&
                !reportsNoVision &&
                String(parsed.imageAnalysisPerformed || "").toLowerCase() === "true",
              photoCount: evidenceAssetIds.length,
              photosAnalyzed,
              provider: response.provider || "assistant",
              providerLabel: response.providerLabel || "AI IPM photo review",
              confidence: String(parsed.visualConfidence || "low").toLowerCase(),
              quality: String(parsed.imageQuality || "limited").toLowerCase(),
              evidenceUsed,
              limitations
            },
            assistantMethodIds: response.methodIds || [],
            assistantSourceIds: response.sourceIds || [],
            assistantCitations: response.citations || []
          };
        }
      }}
      formHeader={({ growId, plantId, facilityId }) => (
        <View style={styles.evidenceSection}>
          <Text style={styles.evidenceTitle}>Scout photos and video</Text>
          <Text style={styles.evidenceGuidance}>
            Best set: one whole-plant photo, the damage pattern, sharp leaf tops and
            undersides, and a macro of the organism or sign. Include a dated sticky trap
            or short video when movement matters. The result will say whether photo pixels
            were actually analyzed.
          </Text>
          <SavedGrowPhotoEvidencePicker
            growId={growId}
            plantId={plantId}
            purpose="ipm"
            value={evidenceAssets}
            onChange={setEvidenceAssets}
            maxPhotos={10}
          />
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
        </View>
      )}
      fields={[
        {
          key: "cropContext",
          label: "Crop and stage",
          defaultValue: "",
          section: "1. Scout area and spread",
          placeholder: "Example: tomato, early fruiting",
          helpText:
            "Use the selected grow when attached; otherwise enter only what you know."
        },
        {
          key: "scoutLocation",
          label: "Scout location",
          defaultValue: "",
          placeholder: "Example: tent 1, north bench, lower canopy",
          helpText: "Name the room, zone, bench, canopy level, or outdoor area."
        },
        {
          key: "plantsChecked",
          label: "Plants checked",
          defaultValue: "",
          keyboardType: "numeric",
          placeholder: "Leave blank if not counted"
        },
        {
          key: "plantsAffected",
          label: "Plants affected",
          defaultValue: "",
          keyboardType: "numeric",
          placeholder: "Leave blank if not counted"
        },
        {
          key: "distribution",
          label: "Where symptoms occur",
          defaultValue: "",
          placeholder: "Scattered, one edge, lower leaves, new growth, whole plant",
          helpText: "Describe the pattern across plants and within each plant."
        },
        {
          key: "progression",
          label: "Progression since last check",
          defaultValue: "",
          placeholder: "New, stable, slowly spreading, rapidly spreading, improving",
          helpText: "Include the time between checks when known."
        },
        {
          key: "pestSeen",
          label: "Pest or organism seen",
          defaultValue: "",
          section: "2. Inspect the evidence",
          placeholder:
            "Not confirmed, or describe body shape, color, movement, eggs, webbing",
          helpText: "Do not name a pest from damage alone. Record what was directly seen."
        },
        {
          key: "leafDamage",
          label: "Damage or symptom pattern",
          defaultValue: "",
          required: true,
          placeholder:
            "Stippling, silvering, holes, trails, spots, residue, wilt, webbing",
          helpText:
            "Describe color, shape, location, residue, frass, eggs, insects, or fungal growth."
        },
        {
          key: "undersideInspection",
          label: "Underside inspection",
          defaultValue: "",
          placeholder: "Not checked, clear, eggs present, moving specks, residue",
          helpText: "State what was inspected and what was actually found."
        },
        {
          key: "magnification",
          label: "Magnification used",
          defaultValue: "",
          placeholder: "None, 10x loupe, 30x loupe, microscope"
        },
        {
          key: "stickyTrapCount",
          label: "Sticky trap count",
          defaultValue: "",
          keyboardType: "numeric",
          placeholder: "Leave blank if no dated count"
        },
        {
          key: "trapContext",
          label: "Trap context",
          defaultValue: "",
          placeholder: "Trap color, zone, hours/days exposed, prior count",
          helpText:
            "A count is meaningful only with location, exposure time, and a comparison."
        },
        {
          key: "environmentConditions",
          label: "Environment and root-zone conditions",
          defaultValue: "",
          section: "3. Conditions and history",
          placeholder:
            "Temperature/RH with units, leaf wetness, airflow, watering/root notes",
          helpText: "Record measurements; do not estimate values from photos."
        },
        {
          key: "recentActions",
          label: "Recent sprays, releases, sanitation, or changes",
          defaultValue: "",
          placeholder: "Product/action, date, label rate if already applied, response",
          helpText: "This is history, not a request for a pesticide rate."
        },
        {
          key: "evidence",
          label: "Direct evidence, comma-separated",
          defaultValue: "",
          multiline: true,
          placeholder:
            "Observed facts only: two moving specks, fine webbing, 6 adults on dated trap"
        },
        {
          key: "additionalInformation",
          label: "Other context or question",
          defaultValue: "",
          multiline: true,
          placeholder:
            "What changed, what you suspect, and what decision you need to make"
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
        evidenceAssetIds: evidencePayload.evidenceAssetIds,
        mediaEvidence: evidencePayload.media
      })}
      buildMetrics={(outputs) => [
        {
          key: "ai-credit-cost",
          label: "AI credits used",
          value: String(outputs.aiCreditsUsed ?? 0),
          detail:
            outputs.gptVerification?.status === "completed"
              ? "Charged for the completed GPT structured second opinion."
              : "No completed provider-backed second opinion was charged."
        },
        {
          key: "readiness",
          label: "Scout readiness",
          value: outputs.readiness?.status || "needs evidence",
          detail: outputs.readiness?.summary || "Review missing checks below."
        },
        { key: "issue", label: "Issue", value: outputs.suspectedIssue },
        { key: "organism", label: "Organism", value: outputs.suspectedOrganism },
        { key: "severity", label: "Severity", value: outputs.severity },
        { key: "confidence", label: "Confidence", value: outputs.confidence },
        {
          key: "affected",
          label: "Plants affected",
          value:
            outputs.pressureSummary?.affectedPercent == null
              ? "Not counted"
              : `${outputs.pressureSummary.plantsAffected}/${outputs.pressureSummary.plantsChecked} (${outputs.pressureSummary.affectedPercent}%)`
        },
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
          label: "Photo pixels analyzed",
          value: outputs.mediaAnalysis?.performed
            ? `Yes — ${outputs.mediaAnalysis.photosAnalyzed || 0} photo(s)`
            : "No",
          detail:
            outputs.mediaAnalysis?.providerLabel ||
            outputs.mediaAnalysis?.status ||
            "Manual evidence only"
        },
        {
          key: "record",
          label: "Saved as",
          value: outputs.documentation?.savedAs || "ToolRun"
        }
      ]}
      buildNotices={(outputs) => [
        {
          key: "photo-analysis-status",
          severity: outputs.mediaAnalysis?.performed
            ? ("info" as const)
            : ("medium" as const),
          message: outputs.mediaAnalysis?.performed
            ? `${outputs.mediaAnalysis.providerLabel || "AI vision"} inspected ${outputs.mediaAnalysis.photosAnalyzed || 0} uploaded photo(s). Treat the visual result as evidence to verify, not an organism confirmation.`
            : outputs.mediaAnalysis?.requested
              ? "Photos are attached, but their pixels were not analyzed in this result. Use written observations or run the image-capable photo step again."
              : "No photo pixels were analyzed. This scout uses only the structured observations you entered."
        },
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
          : []),
        ...(Array.isArray(outputs.supportingEvidence) && outputs.supportingEvidence.length
          ? [
              {
                key: "supporting-evidence",
                severity: "info" as const,
                message: `Evidence supporting the working hypothesis: ${outputs.supportingEvidence.join("; ")}`
              }
            ]
          : []),
        ...(Array.isArray(outputs.counterEvidence) && outputs.counterEvidence.length
          ? [
              {
                key: "local-counter-evidence",
                severity: "info" as const,
                message: `Counter-evidence or competing explanations: ${outputs.counterEvidence.join("; ")}`
              }
            ]
          : []),
        ...(Array.isArray(outputs.missingInformation) && outputs.missingInformation.length
          ? [
              {
                key: "local-missing-information",
                severity: "medium" as const,
                message: `Still needed: ${outputs.missingInformation.join("; ")}`
              }
            ]
          : []),
        ...(Array.isArray(outputs.nextInspectionSteps) &&
        outputs.nextInspectionSteps.length
          ? [
              {
                key: "next-inspection-steps",
                severity: "info" as const,
                message: `Next checks: ${outputs.nextInspectionSteps.join("; ")}`
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
      buildActions={({
        outputs,
        payload,
        toolRun,
        moduleRecord,
        growId,
        plantContext
      }) => [
        {
          key: "ipm-decision-likely",
          label: "Mark as Likely Match",
          pendingLabel: "Saving...",
          successMessage: "Saved as the working hypothesis—not a confirmed ID.",
          onPress: () =>
            recordIpmDecision({
              decision: "accepted",
              outputs,
              toolRun,
              moduleRecord
            })
        },
        {
          key: "ipm-decision-uncertain",
          label: "Mark as Not Sure",
          variant: "secondary",
          pendingLabel: "Saving...",
          successMessage:
            "Saved as uncertain; gather the missing evidence before acting.",
          onPress: () =>
            recordIpmDecision({
              decision: "uncertain",
              outputs,
              toolRun,
              moduleRecord
            })
        },
        {
          key: "ipm-decision-rejected",
          label: "Mark as Doesn't Match",
          variant: "secondary",
          pendingLabel: "Saving...",
          successMessage: "Saved as rejected for future outcome review.",
          onPress: () =>
            recordIpmDecision({
              decision: "rejected",
              outputs,
              toolRun,
              moduleRecord
            })
        },
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

const styles = StyleSheet.create({
  evidenceSection: { gap: 8 },
  evidenceTitle: { color: "#0F172A", fontSize: 15, fontWeight: "800" },
  evidenceGuidance: { color: "#475569", lineHeight: 19 }
});
