import React, { useMemo, useState } from "react";
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
  type GrowpathModuleRecord
} from "@/api/growpathModules";
import { updateIpmToolRunDecision, type ToolRun } from "@/api/toolRuns";
import { PLANT_REVIEW_PHOTO_LIMIT } from "@/features/personal/diagnosis/photoEvidenceQuality";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

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
  if (fieldKey === "pestSeen") {
    if (
      isUnknownPlaceholder ||
      /(?:not\s+confirmed|\bpossible\b|\bsuspect(?:ed)?\b|\blikely\b|\bhypothesis\b|\bmay\s+be\b|[- ]like\b)/i.test(
        text
      )
    ) {
      return "not confirmed";
    }
    return undefined;
  }
  if (isUnknownPlaceholder) return "";
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
  moduleRecord,
  workspaceType,
  facilityId
}: {
  decision: "accepted" | "uncertain" | "rejected";
  outputs: Record<string, any>;
  toolRun: ToolRun | null;
  moduleRecord: GrowpathModuleRecord | null;
  workspaceType: "personal" | "commercial" | "facility";
  facilityId?: string;
}) {
  const recordedAt = new Date().toISOString();
  const toolRunId = String(toolRun?.id || toolRun?._id || "");
  const moduleRecordId = String(moduleRecord?.id || moduleRecord?._id || "");
  let saved = false;

  if (toolRunId) {
    const updatedRun = await updateIpmToolRunDecision(toolRunId, decision, {
      workspaceType,
      ...(facilityId ? { facilityId } : {})
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
  const unresolved =
    String(outputs.differentialStatus || "").startsWith("unresolved") ||
    /needs|insufficient|unresolved/i.test(String(outputs.readiness?.status || "")) ||
    (outputs.mediaAnalysis?.requested === true &&
      outputs.mediaAnalysis?.performed !== true);
  if (!unresolved && planned.length) {
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

  const verification = verificationAnswer(outputs.gptVerification);
  const growPath = growPathAnswer(outputs);
  return [
    {
      title: "Repeat IPM scout with distinguishing evidence",
      priority: "medium",
      dueDate: tomorrow(outputs.taskSuggestions?.[0]?.dueInDays || 3),
      ...calendarMetadata,
      description: [
        growPath ? `GrowPath AI: ${growPath}` : "",
        verification
          ? `GPT verification: ${verification}`
          : outputs.gptVerification?.status
            ? `GPT verification status: ${outputs.gptVerification.status}.`
            : "",
        "Collect neutral-light leaf-top, leaf-underside, and target-macro evidence; repeat comparable trap and plant counts before choosing any treatment."
      ]
        .filter(Boolean)
        .join(" ")
    }
  ];
}

export function verifiedIpmPrefillMetadata({
  response,
  parsed,
  selectedEvidenceAssetIds,
  imageEvidenceAssetIds
}: {
  response: any;
  parsed: Record<string, any>;
  selectedEvidenceAssetIds: string[];
  imageEvidenceAssetIds: string[];
}) {
  const receipt = response.analysisReceipt;
  const evidenceUsed = Array.isArray(response.evidenceUsed)
    ? response.evidenceUsed.map(String).sort()
    : [];
  const expectedImages = [...imageEvidenceAssetIds].map(String).sort();
  const limitations = Array.isArray(response.limitations) ? response.limitations : [];
  const reportsNoVision = limitations.some((item: unknown) =>
    /text[- ]only|cannot (inspect|analyze|view)|image pixels? (were )?not|visual analysis (was )?not/i.test(
      String(item)
    )
  );
  const photosAnalyzed = Number(response.mediaAnalysis?.photosAnalyzed || 0);
  const valid = Boolean(
    selectedEvidenceAssetIds.length > 0 &&
    expectedImages.length > 0 &&
    receipt?.aiUsageEventId &&
    /^[a-f0-9]{64}$/i.test(String(receipt?.normalizedIpmResultDigest || "")) &&
    receipt?.reviewPolicyVersion === "ipm-observation-differential-v2" &&
    receipt?.evidenceFingerprint === expectedImages.join("|") &&
    evidenceUsed.length === expectedImages.length &&
    evidenceUsed.every((id: string, index: number) => id === expectedImages[index]) &&
    photosAnalyzed === expectedImages.length &&
    !reportsNoVision &&
    String(parsed.imageAnalysisPerformed || "").toLowerCase() === "true"
  );
  if (!valid) {
    throw new Error(
      "The IPM photo review could not be matched to this exact photo/video-frame set. No AI observations were applied; keep your own entries and retry with the evidence still attached."
    );
  }
  return {
    imageAnalysis: {
      requested: true,
      performed: true,
      photoCount: expectedImages.length,
      photosAnalyzed,
      provider: response.provider || "assistant",
      providerModel: response.mediaAnalysis?.providerModel || undefined,
      providerLabel: response.providerLabel || "AI IPM photo review",
      status: response.mediaAnalysis?.status || "photo_pixels_analyzed",
      confidence: String(parsed.visualConfidence || "low").toLowerCase(),
      quality: String(parsed.imageQuality || "limited").toLowerCase(),
      evidenceUsed,
      limitations,
      aiUsageEventId: receipt.aiUsageEventId,
      normalizedIpmResultDigest: receipt.normalizedIpmResultDigest,
      evidenceFingerprint: receipt.evidenceFingerprint,
      reviewPolicyVersion: receipt.reviewPolicyVersion
    },
    assistantMethodIds: response.methodIds || [],
    assistantSourceIds: response.sourceIds || [],
    assistantCitations: response.citations || []
  };
}

export default function IpmScoutToolRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createIpmScoutStyles(palette), [palette]);
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  const evidencePayload = providerEvidencePayload(evidenceAssets);
  return (
    <BackendCalculatorToolScreen
      externalInputKey={`ipm-evidence:${[...evidencePayload.evidenceAssetIds]
        .map(String)
        .sort()
        .join("|")}`}
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
        preserveAllExistingFields: true,
        evidenceAssetIds: () => evidencePayload.evidenceAssetIds,
        isReady: () => evidencePayload.images.length > 0,
        notReadyMessage:
          "Upload at least one clear photo before asking AI to inspect the scout evidence. You can still complete the form manually.",
        buildMessage: ({ values }) =>
          `Inspect the attached image pixels, then prefill a cautious ETGU/IPM scout. Return JSON only with exactly these string keys: {"cropContext":"","scoutLocation":"","plantsChecked":"","plantsAffected":"","pestSeen":"","leafDamage":"","distribution":"","progression":"","undersideInspection":"","magnification":"","stickyTrapCount":"","trapContext":"","environmentConditions":"","recentActions":"","evidence":"","additionalInformation":"","imageAnalysisPerformed":"true or false","imageQuality":"usable, limited, or unusable","visualConfidence":"high, medium, or low"}.

Evidence rules:
- Keep direct organism observations, disease signs, damage patterns, and hypotheses separate.
- pestSeen may contain an organism name only when a sharp view shows defensible body morphology, eggs, larvae, movement, webbing, frass, or another direct organism sign. Otherwise write "not confirmed". Never put "powdery mildew-like", "thrips-like", or another hypothesis in pestSeen.
- Generic white, pale, or reflective marks alone are ambiguous. Compare superficial white/gray powdery growth with thrips or mite feeding damage, spray/residue, mineral deposits, dust, glare, and senescent or physical damage. Do not label powdery mildew from white marks alone.
- A powdery-mildew hypothesis needs a sharp, color-reliable macro showing superficial powdery/felt-like growth plus a second independent discriminator such as another role-diverse view or a user-recorded wipe/transfer observation.
- A thrips hypothesis needs compatible silvering, stippling, streaking, scarring, or distorted tissue plus black frass or a sharp direct view of a slender insect or larva. Do not infer thrips from generic pale marks alone.
- If the light, glare, focus, scale, target, leaf surface, or color is limited, set imageQuality to limited or unusable and visualConfidence to low. Ask for neutral-light leaf-top, leaf-underside, and target-macro retakes that separate the leading candidates.
- When several organisms, objects, or possible targets appear, enumerate their defensible visible traits separately and do not assume the largest or most obvious subject is the target.
- Never invent counts, progression, magnification, trap findings, environment, prior actions, location, crop, stage, or user history. plantsChecked, plantsAffected, and stickyTrapCount must stay empty because a photo is not a completed scout count.
- Leave every unknown value blank; except for pestSeen, do not fill fields with placeholder phrases. evidence must contain only visible facts, not media IDs or diagnoses. Put ranked hypotheses, counter-evidence, and exact discriminating retakes in additionalInformation.
- Do not recommend pesticide products or rates.

The following is explicit user-entered context. Preserve it, do not overwrite it, and do not reinterpret a suspicion as a visual fact:
${JSON.stringify(values, null, 2)}`,
        normalizeFieldValue: normalizeIpmPrefillField,
        buildPayloadMetadata: ({ response, parsed }) =>
          verifiedIpmPrefillMetadata({
            response,
            parsed,
            selectedEvidenceAssetIds: evidencePayload.evidenceAssetIds,
            imageEvidenceAssetIds: evidencePayload.imageEvidenceAssetIds
          })
      }}
      resultFollowUp={{
        workflow: "ipm-result-follow-up",
        evidenceAssetIds: () => evidencePayload.evidenceAssetIds,
        suggestions: () => [
          "Compare thrips, mites, and powdery mildew.",
          "What evidence contradicts this result?",
          "What close-up should I add to separate the leading possibilities?"
        ]
      }}
      formHeader={({ growId, plantId, facilityId, workspaceType }) => (
        <View style={styles.evidenceSection}>
          <Text style={styles.evidenceTitle}>Scout photos and video</Text>
          <Text style={styles.evidenceGuidance}>
            Best set: one whole-plant photo, the damage pattern, sharp leaf tops and
            undersides, and a macro of the organism or sign. Include a dated sticky trap
            or short video when movement matters. Up to {PLANT_REVIEW_PHOTO_LIMIT} photos
            can cover zoomed-out context, several plants, both leaf surfaces, and macro
            details. If several organisms or objects appear, say which one GrowPath should
            inspect and add a dedicated macro of that target. The result will say whether
            photo pixels were actually analyzed.
          </Text>
          {workspaceType === "personal" ? (
            <SavedGrowPhotoEvidencePicker
              growId={growId}
              plantId={plantId}
              purpose="ipm"
              value={evidenceAssets}
              onChange={setEvidenceAssets}
              maxPhotos={PLANT_REVIEW_PHOTO_LIMIT}
            />
          ) : null}
          <MediaEvidencePicker
            aiUsable
            maxPhotos={PLANT_REVIEW_PHOTO_LIMIT}
            allowVideo
            extractFramesFromVideo
            maxExtractedVideoFrames={PLANT_REVIEW_PHOTO_LIMIT}
            maxVideoSeconds={599}
            purpose="ipm"
            sourceContext={{
              growId: growId || undefined,
              facilityId: facilityId || undefined
            }}
            videoWorkspaceType={workspaceType}
            videoWorkspaceId={workspaceType === "facility" ? facilityId : undefined}
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
            "Which organism or spot in the photo is the target, what changed, what you suspect, and what decision you need to make"
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
        {
          key: "result-type",
          label: "Result type",
          value: String(outputs.differentialStatus || "working_hypothesis").replaceAll(
            "_",
            " "
          ),
          detail: outputs.differentialStatus?.startsWith("unresolved")
            ? "The saved result keeps close possibilities open until a distinguishing check is completed."
            : "This remains a working hypothesis, not a confirmed diagnosis."
        },
        {
          key: "independent-evidence",
          label: "Independent evidence channels",
          value: String(outputs.readiness?.completedEvidenceChannels ?? 0),
          detail:
            "Repeated text copied from one photo is counted once, not as separate confirmation."
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
        ...(String(outputs.differentialStatus || "").startsWith("unresolved")
          ? [
              {
                key: "unresolved-differential",
                severity: "high" as const,
                message:
                  "Unresolved differential: this result does not support one confirmed pest or disease headline. Compare the ranked candidates and complete the distinguishing checks before choosing treatment."
              }
            ]
          : []),
        ...(Array.isArray(outputs.rankedCandidates) && outputs.rankedCandidates.length
          ? [
              {
                key: "ranked-candidates",
                severity: "info" as const,
                message: `Candidate comparison: ${outputs.rankedCandidates
                  .slice(0, 3)
                  .map(
                    (candidate: any) =>
                      `${candidate.suspectedOrganism || "unresolved candidate"} (${candidate.evidenceGateStatus || "pattern only"}; confidence ceiling ${candidate.confidenceCeiling || "not provided"})`
                  )
                  .join("; ")}.`
              }
            ]
          : []),
        ...(Array.isArray(outputs.confidenceCeilings) && outputs.confidenceCeilings.length
          ? [
              {
                key: "confidence-ceilings",
                severity: "medium" as const,
                message: `Why confidence cannot be higher: ${outputs.confidenceCeilings.join(" ")}`
              }
            ]
          : []),
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
      defaultTask={(outputs) => {
        const task = ipmTaskPlan(outputs)[0];
        return task
          ? {
              title: task.title,
              description: task.description,
              priority: task.priority,
              dueDate: task.dueDate,
              endAt: task.endAt || undefined,
              allDay: task.allDay,
              calendarType: task.calendarType || undefined,
              sourceStage: task.sourceStage || undefined,
              reminderPlan: task.reminderPlan || undefined,
              recurrence: task.recurrence || undefined
            }
          : undefined;
      }}
      buildActions={({
        outputs,
        payload,
        toolRun,
        moduleRecord,
        growId,
        plantContext,
        workspaceType,
        facilityId
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
              moduleRecord,
              workspaceType,
              facilityId
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
              moduleRecord,
              workspaceType,
              facilityId
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
              moduleRecord,
              workspaceType,
              facilityId
            })
        },
        {
          key: "create-ipm-task-plan",
          label: "Create IPM Task Plan",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: workspaceType === "commercial" || (!growId && !payload.facilityId),
          successMessage: "Created IPM tasks.",
          onPress: async () => {
            if (workspaceType === "commercial") {
              throw new Error(
                "Commercial IPM task creation is not connected yet; no Personal task was created."
              );
            }
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

export const createIpmScoutStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    evidenceSection: { gap: 8 },
    evidenceTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
    evidenceGuidance: { color: palette.textMuted, lineHeight: 19 }
  });
