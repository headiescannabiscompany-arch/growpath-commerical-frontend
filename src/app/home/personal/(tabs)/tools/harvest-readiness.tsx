import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import {
  getHarvestBatch,
  updateHarvestBatch,
  type DryCureRecordInput
} from "@/api/harvestBatches";
import { analyzeTrichomePhotos, type TrichomeVisionResult } from "@/api/harvestVision";
import { providerEvidencePayload } from "@/api/evidence";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { radius } from "@/theme/theme";
import type { EvidenceAsset } from "@/types/evidence";

const MIN_HARVEST_PHOTOS = 4;

const HARVEST_PHOTO_CHECKLIST = [
  "Use at least 3 sharp macro photos from top, middle, and lower bud sites.",
  "Focus on intact trichome gland heads on bud calyxes, not pistils or sugar-leaf edges.",
  "Use neutral white light; avoid purple LEDs, glare, blur, digital zoom, and heavy compression.",
  "Include one wider bud-context photo so each macro sample has a clear location."
];

function harvestPhotoRecoveryMessage(detail?: string) {
  return [
    detail || "Photo analysis could not run.",
    "No trichome fields were filled.",
    "Retake or reselect the photos using the checklist:",
    HARVEST_PHOTO_CHECKLIST.join(" ")
  ]
    .filter(Boolean)
    .join(" ");
}

function HarvestPhotoAnalyzer({
  growId,
  plantId,
  evidenceAssets,
  onEvidenceAssetsChange,
  initialAnalysis,
  onAnalysis
}: {
  growId: string;
  plantId: string;
  evidenceAssets: EvidenceAsset[];
  onEvidenceAssetsChange: (assets: EvidenceAsset[]) => void;
  initialAnalysis: TrichomeVisionResult | null;
  onAnalysis: (result: TrichomeVisionResult | null) => void;
}) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [analysis, setAnalysis] = useState<TrichomeVisionResult | null>(initialAnalysis);
  const evidence = providerEvidencePayload(evidenceAssets);
  const photoCount = evidence.images.length;

  function updateEvidence(next: EvidenceAsset[]) {
    onEvidenceAssetsChange(next);
    setAnalysis(null);
    onAnalysis(null);
    const nextPhotoCount = providerEvidencePayload(next).images.length;
    setFeedback(
      nextPhotoCount >= MIN_HARVEST_PHOTOS
        ? "Photo set uploaded. Confirm the samples meet the checklist, then run the AI review."
        : "Keep adding evidence: three sharp macro bud-site samples plus one wider context photo are required. No AI credit is used until a complete set is submitted."
    );
  }

  async function analyze() {
    if (!growId || photoCount < MIN_HARVEST_PHOTOS || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const result = await analyzeTrichomePhotos({
        growId,
        evidenceAssetIds: evidence.evidenceAssetIds,
        sampleLocation: "mixed_bud_sites",
        notes: notes.trim() || undefined
      });
      setAnalysis(result);
      onAnalysis(result);
      setFeedback(
        result.photoUsable
          ? `${result.imagesAnalyzed} photos were inspected and 1 AI credit was charged. The clear, cloudy, and amber fields below are filled. Review the evidence and other maturity signals before running the readiness estimate.`
          : [
              `${result.imagesAnalyzed} photos were inspected and 1 AI credit was charged, but the set is not reliable enough to fill trichome percentages.`,
              result.recommendation,
              ...(result.limitations || []),
              ...HARVEST_PHOTO_CHECKLIST
            ]
              .filter(Boolean)
              .join(" ")
      );
    } catch (error: any) {
      setAnalysis(null);
      onAnalysis(null);
      setFeedback(
        harvestPhotoRecoveryMessage(
          error?.message
            ? `Photo analysis did not run: ${error.message}`
            : "Photo analysis did not run."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={photoStyles.card}>
      <Text style={photoStyles.title}>AI trichome photo estimate (optional)</Text>
      <Text style={photoStyles.help}>
        The free readiness calculator works from observations you enter. Optional AI photo
        review costs 1 AI credit only after a complete four-photo set is submitted. A
        provider failure is refunded automatically. Photo review never makes the harvest
        decision by itself.
      </Text>
      <View style={photoStyles.checklist} accessibilityLabel="Harvest photo checklist">
        <Text style={photoStyles.checklistTitle}>Photo checklist before analysis</Text>
        {HARVEST_PHOTO_CHECKLIST.map((item, index) => (
          <Text key={item} style={photoStyles.checklistItem}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>
      <MediaEvidencePicker
        maxPhotos={10}
        purpose="harvest"
        aiUsable
        sourceContext={{ growId: growId || undefined, plantId: plantId || undefined }}
        value={evidenceAssets}
        onChange={updateEvidence}
      />
      <TextInput
        accessibilityLabel="Harvest photo notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional: lens, lighting, sample location"
        style={photoStyles.input}
      />
      <Pressable
        accessibilityLabel="Analyze harvest trichome photo"
        onPress={analyze}
        disabled={busy || !growId || photoCount < MIN_HARVEST_PHOTOS}
        style={[
          photoStyles.button,
          (busy || !growId || photoCount < MIN_HARVEST_PHOTOS) && photoStyles.disabled
        ]}
      >
        <Text style={photoStyles.buttonText}>
          {busy ? "Inspecting Photos..." : "Analyze Photo Set (1 AI Credit)"}
        </Text>
      </Pressable>
      {!growId ? (
        <Text style={photoStyles.warning}>Select a grow before analyzing a photo.</Text>
      ) : null}
      {!photoCount ? (
        <Text style={photoStyles.warning}>
          No trichome evidence is ready. Add three sharp macro bud-site samples and one
          wider context photo. Ordinary whole-plant photos cannot support
          clear/cloudy/amber percentages.
        </Text>
      ) : photoCount < MIN_HARVEST_PHOTOS ? (
        <Text style={photoStyles.warning}>
          Add {MIN_HARVEST_PHOTOS - photoCount} more photo
          {MIN_HARVEST_PHOTOS - photoCount === 1 ? "" : "s"}. The required set is three
          sharp macros from top, middle, and lower bud sites plus one wider bud-context
          photo. Analysis is blocked, so no AI credit will be used yet.
        </Text>
      ) : null}
      {feedback ? <Text style={photoStyles.feedback}>{feedback}</Text> : null}
      {analysis ? (
        <View
          accessibilityLabel="Harvest photo analysis result"
          style={photoStyles.analysis}
        >
          <Text style={photoStyles.analysisTitle}>
            {analysis.photoUsable
              ? "Qualified macro evidence"
              : "Better photos needed — no percentages filled"}
          </Text>
          <Text style={photoStyles.feedback}>
            Image quality: {analysis.imageQuality} · Confidence:{" "}
            {Math.round(analysis.confidence * 100)}%
          </Text>
          <Text style={photoStyles.feedback}>
            Inspected by {analysis.providerLabel} ({analysis.providerModel}) · Photos:{" "}
            {analysis.imagesAnalyzed}
          </Text>
          <Text style={photoStyles.feedback}>
            AI credit: {analysis.aiCreditsUsed} charged
            {typeof analysis.aiTokensRemaining === "number"
              ? ` · ${analysis.aiTokensRemaining} remaining`
              : ""}
          </Text>
          <Text style={photoStyles.feedback}>
            Review ID: {analysis.analysisId || "not provided"}
          </Text>
          {analysis.photoUsable ? (
            <Text style={photoStyles.feedback}>
              AI estimate: {Math.round(Number(analysis.cloudy) * 100)}% cloudy,{" "}
              {Math.round(Number(analysis.amber) * 100)}% amber,{" "}
              {Math.round(Number(analysis.clear) * 100)}% clear.
            </Text>
          ) : null}
          {analysis.recommendation ? (
            <Text style={photoStyles.recommendation}>{analysis.recommendation}</Text>
          ) : null}
          {analysis.photoUsable ? (
            <Text style={photoStyles.recommendation}>
              The fields below are filled. Review the remaining maturity signals, then run
              the rule-based readiness estimate.
            </Text>
          ) : null}
          {(analysis.visibleTraits || []).map((item, index) => (
            <Text key={`trait-${index}`} style={photoStyles.feedback}>
              Visible: {item}
            </Text>
          ))}
          {(analysis.evidence || []).map((item, index) => (
            <Text key={`evidence-${index}`} style={photoStyles.feedback}>
              Evidence: {item}
            </Text>
          ))}
          {(analysis.limitations || []).map((item, index) => (
            <Text key={`limitation-${index}`} style={photoStyles.warning}>
              Limitation: {item}
            </Text>
          ))}
          {analysis.evidenceUsed?.length ? (
            <Text style={photoStyles.feedback}>
              Evidence IDs: {analysis.evidenceUsed.join(", ")}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function numberOrFallback(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function harvestCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "harvest_readiness",
    sourceStage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
}

function readinessTaskPlan(outputs: Record<string, any>, payload: Record<string, any>) {
  const flowerDay = numberOrFallback(payload.flowerDay, 0);
  const startDay = numberOrFallback(outputs.estimatedWindow?.startDay, flowerDay + 3);
  const targetDay = numberOrFallback(
    outputs.estimatedWindow?.targetDay,
    outputs.harvestTask?.dueInDays
      ? flowerDay + Number(outputs.harvestTask.dueInDays)
      : flowerDay + 7
  );
  const recheckDueInDays = numberOrFallback(outputs.harvestTask?.dueInDays, 3);
  const windowStartDueInDays = Math.max(1, Math.round(startDay - flowerDay));
  const targetDueInDays = Math.max(
    windowStartDueInDays,
    Math.round(targetDay - flowerDay)
  );
  const readiness = String(outputs.readinessStatus || "harvest readiness").replaceAll(
    "_",
    " "
  );
  const warningText =
    Array.isArray(outputs.warnings) && outputs.warnings.length
      ? `\nWarnings: ${outputs.warnings.join("; ")}`
      : "";

  return [
    {
      title: outputs.harvestTask?.title || "Recheck harvest readiness",
      priority: outputs.harvestTask?.priority || "medium",
      dueDate: tomorrow(recheckDueInDays),
      ...harvestCalendarMetadata("harvest_readiness_recheck"),
      description: [
        `Current readiness: ${readiness}.`,
        "Recheck trichomes, pistils, aroma, bud swell, and whole-plant maturity.",
        `Sample location: ${payload.sampleLocation || "mixed bud sites"}.`,
        warningText.trim()
      ]
        .filter(Boolean)
        .join("\n")
    },
    {
      title: "Capture top and lower trichome photos",
      priority: "medium" as const,
      dueDate: tomorrow(recheckDueInDays),
      ...harvestCalendarMetadata("trichome_photo_capture"),
      description:
        "Take clear photos from top and lower buds so harvest timing is not based on one sample site."
    },
    {
      title: "Make harvest window decision",
      priority: "high" as const,
      dueDate: tomorrow(windowStartDueInDays),
      ...harvestCalendarMetadata("harvest_window_decision"),
      description: [
        `Estimated window starts around flower day ${startDay}.`,
        `Target day is ${targetDay} for goal: ${payload.userGoal || "balanced"}.`,
        "Decide whether to harvest all at once, delay, or partial harvest tops before lowers."
      ].join("\n")
    },
    {
      title: "Prepare dry/cure setup",
      priority: "high" as const,
      dueDate: tomorrow(Math.max(1, targetDueInDays - 1)),
      ...harvestCalendarMetadata("dry_cure_setup"),
      description:
        "Prepare dry space targets, jars/bags, labels, and post-harvest notes before cutting plants."
    }
  ];
}

function harvestReviewNotes(outputs: Record<string, any>, payload: Record<string, any>) {
  const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
  return [
    `Readiness: ${String(outputs.readinessStatus || "unknown").replaceAll("_", " ")}.`,
    outputs.estimatedWindow
      ? `Window: flower day ${outputs.estimatedWindow.startDay ?? "-"} to ${
          outputs.estimatedWindow.endDay ?? "-"
        }, target ${outputs.estimatedWindow.targetDay ?? "-"}.`
      : "",
    `Trichomes: cloudy ${payload.cloudyPercent || "-"}%, amber ${
      payload.amberPercent || "-"
    }%, clear ${payload.clearPercent || "-"}%.`,
    `Sample: ${payload.sampleLocation || "mixed bud sites"}.`,
    `Goal: ${payload.userGoal || "balanced"}.`,
    warnings.length ? `Warnings: ${warnings.join("; ")}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function harvestReviewRecord(
  outputs: Record<string, any>,
  payload: Record<string, any>,
  toolRunId: string
): DryCureRecordInput {
  return {
    recordedAt: new Date().toISOString(),
    stage: "quality_review",
    qualityNotes: harvestReviewNotes(outputs, payload),
    linkedToolRunId: toolRunId
  };
}

export default function HarvestReadinessToolRoute() {
  const [vision, setVision] = useState<TrichomeVisionResult | null>(null);
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  const harvestEvidence = providerEvidencePayload(evidenceAssets);
  return (
    <BackendCalculatorToolScreen
      key={
        vision?.photoUsable
          ? `${vision.clear}-${vision.cloudy}-${vision.amber}`
          : "manual"
      }
      tool="harvest-readiness"
      toolKey="harvest-readiness"
      title="Harvest Readiness Estimate"
      subtitle="Review breeder timing, flower day, macro trichome evidence, pistils, bud swell, aroma trend, and whole-plant maturity together. Unknown values stay blank. A photo estimate is never a harvest order."
      aiCreditMessage="The readiness calculator is free. Fill from grow and Analyze Photo Set are separate optional AI actions; each successful action uses 1 AI credit, and provider failures are refunded."
      aiPrefill={{
        buttonLabel: "Fill readiness review from grow",
        clearUnfilled: true,
        buildMessage: () =>
          `Prefill a Harvest Readiness review using the selected grow and plant's saved timeline, breeder/cultivar information, logs, photos and prior vision results, environment, tasks, diagnoses, and harvest records. Return JSON only with exactly these keys: {"flowerDay":"string","breederFlowerTime":"string","cloudyPercent":"string","amberPercent":"string","clearPercent":"string","pistilStatus":"string","budSwellStatus":"string","sampleLocation":"string","harvestBatchId":"string","aromaIntensity":"string","userGoal":"string","additionalInformation":"string"}. Never infer trichome percentages from ordinary plant photos; fill them only from a saved usable macro-photo analysis. If current media is missing, blurry, lacks visible trichome heads, or covers too few bud sites, leave those percentages blank and explain exactly which better photos are needed in additionalInformation. Leave unknown observations blank rather than inventing them.`
      }}
      formHeader={({ growId, plantId }) => (
        <HarvestPhotoAnalyzer
          growId={growId}
          plantId={plantId}
          evidenceAssets={evidenceAssets}
          onEvidenceAssetsChange={setEvidenceAssets}
          initialAnalysis={vision}
          onAnalysis={setVision}
        />
      )}
      fields={[
        {
          key: "flowerDay",
          label: "Flower day",
          defaultValue: "",
          keyboardType: "numeric",
          placeholder: "For example: 56",
          helpText: "Count from the actual flip/flower record; leave blank if unknown."
        },
        {
          key: "breederFlowerTime",
          label: "Breeder timeline day (for example 65)",
          defaultValue: "",
          keyboardType: "numeric",
          helpText: "Reference only—not proof that this phenotype is ready."
        },
        {
          key: "cloudyPercent",
          label: "Cloudy %",
          defaultValue: vision?.photoUsable
            ? String(Math.round(Number(vision.cloudy) * 100))
            : "",
          keyboardType: "numeric",
          helpText:
            "Use qualified macro observations. Leave blank when heads are not sharp."
        },
        {
          key: "amberPercent",
          label: "Amber %",
          defaultValue: vision?.photoUsable
            ? String(Math.round(Number(vision.amber) * 100))
            : "",
          keyboardType: "numeric"
        },
        {
          key: "clearPercent",
          label: "Clear %",
          defaultValue: vision?.photoUsable
            ? String(Math.round(Number(vision.clear) * 100))
            : "",
          keyboardType: "numeric"
        },
        {
          key: "pistilStatus",
          label: "Hair / pistil status (fresh, dying, dark, receded)",
          defaultValue: "",
          placeholder: "Describe what you actually observe"
        },
        {
          key: "budSwellStatus",
          label: "Bud structure (still developing or fully finished)",
          defaultValue: "",
          placeholder: "Still developing, mostly swollen, uneven..."
        },
        {
          key: "sampleLocation",
          label: "Trichome sample location",
          defaultValue: "",
          placeholder: "Top, middle, and lower calyx samples"
        },
        {
          key: "harvestBatchId",
          label: "Harvest batch ID (optional)",
          defaultValue: ""
        },
        {
          key: "aromaIntensity",
          label: "Aroma trend (building, peak, or dropping)",
          defaultValue: "",
          placeholder: "Building, stable peak, dropping, unknown"
        },
        {
          key: "userGoal",
          label: "Effect goal (saved as context; not scored yet)",
          defaultValue: "",
          placeholder: "Optional context"
        },
        {
          key: "additionalInformation",
          label: "Additional observations or questions (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        ...values,
        budSwell: values.budSwellStatus,
        smellNotes: values.aromaIntensity,
        trichomeSource: vision?.photoUsable ? "ai_photo_estimate" : "manual_entry",
        evidenceAssetIds: harvestEvidence.evidenceAssetIds,
        mediaEvidence: harvestEvidence.media,
        photoAnalysis: vision
          ? {
              ...vision,
              performed: true
            }
          : undefined,
        harvestBatchId: values.harvestBatchId.trim() || undefined,
        additionalInformation: values.additionalInformation.trim() || undefined
      })}
      buildMetrics={(outputs) => [
        { key: "status", label: "Readiness", value: outputs.readinessStatus },
        {
          key: "window",
          label: "Estimated window",
          value:
            typeof outputs.estimatedWindow === "string"
              ? outputs.estimatedWindow.replaceAll("_", " ")
              : undefined
        },
        { key: "start", label: "Start day", value: outputs.estimatedWindow?.startDay },
        {
          key: "target",
          label: "Target day",
          value: outputs.estimatedWindow?.targetDay
        },
        { key: "end", label: "End day", value: outputs.estimatedWindow?.endDay },
        {
          key: "pistils",
          label: "Pistils",
          value: outputs.wholePlantMaturity?.pistilStatus
        },
        {
          key: "swell",
          label: "Bud structure",
          value: outputs.wholePlantMaturity?.budSwellStatus
        },
        {
          key: "breeder-reference",
          label: "Breeder timeline",
          value: outputs.breederTimelineInterpretation
        },
        {
          key: "trichome-advice",
          label: "Trichome advice",
          value: outputs.trichomeInterpretation
        },
        {
          key: "trichome-source",
          label: "Trichome values source",
          value:
            outputs.trichomeSource === "ai_photo_estimate"
              ? `AI photo estimate (${Math.round(
                  Number(outputs.photoAnalysis?.confidence || 0) * 100
                )}% confidence)`
              : "Manual or missing; photos were not used for percentages"
        },
        {
          key: "photo-review",
          label: "Photo review",
          value: outputs.photoAnalysis?.performed
            ? `${outputs.photoAnalysis.imagesAnalyzed || 0} inspected · ${
                outputs.photoAnalysis.imageQuality || "quality unknown"
              } · ${outputs.photoAnalysis.providerLabel || "provider unknown"} (${
                outputs.photoAnalysis.providerModel || "model unknown"
              })`
            : "Not run"
        },
        {
          key: "photo-credit",
          label: "Photo AI credit",
          value: outputs.photoAnalysis?.performed
            ? `${outputs.photoAnalysis.aiCreditsUsed ?? "-"} charged · ${
                outputs.photoAnalysis.aiTokensRemaining ?? "-"
              } remaining`
            : "Not used"
        },
        {
          key: "photo-review-id",
          label: "Photo review ID",
          value: outputs.photoAnalysis?.analysisId || undefined
        },
        {
          key: "photo-evidence-ids",
          label: "Photo evidence IDs",
          value: Array.isArray(outputs.photoAnalysis?.evidenceUsed)
            ? outputs.photoAnalysis.evidenceUsed.join(", ")
            : undefined
        },
        {
          key: "aroma-advice",
          label: "Smell / flavor",
          value: outputs.aromaFlavorInterpretation
        }
      ]}
      buildNotices={(outputs) => {
        const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
        const photo = outputs.photoAnalysis;
        return [
          ...(photo?.performed
            ? [
                {
                  key: "photo-analysis-status",
                  severity: photo.photoUsable ? ("info" as const) : ("medium" as const),
                  message: photo.photoUsable
                    ? `${photo.providerLabel || "AI image review"} inspected ${
                        photo.imagesAnalyzed || 0
                      } photos. Treat the distribution as a visual estimate and confirm across the whole plant.`
                    : `The image review ran, but no percentages were accepted. ${
                        photo.recommendation || HARVEST_PHOTO_CHECKLIST.join(" ")
                      }`
                },
                ...(Array.isArray(photo.limitations)
                  ? photo.limitations.map((message: string, index: number) => ({
                      key: `photo-limitation-${index}`,
                      severity: "medium" as const,
                      message
                    }))
                  : [])
              ]
            : []),
          ...warnings.map((message: string, index: number) => ({
            key: `warning-${index}`,
            severity: "medium" as const,
            message
          }))
        ];
      }}
      defaultLogTitle={(outputs) =>
        `Harvest readiness: ${outputs.readinessStatus || "check"}`
      }
      defaultTask={(outputs) => ({
        title: outputs.harvestTask?.title || "Recheck harvest readiness",
        priority: outputs.harvestTask?.priority || "medium",
        dueDate: tomorrow(outputs.harvestTask?.dueInDays || 3),
        ...harvestCalendarMetadata("harvest_readiness_recheck"),
        description:
          "Recheck trichomes, pistils, aroma, bud swell, and whole-plant maturity."
      })}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-harvest-readiness-task-plan",
          label: "Create Harvest Decision Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created harvest decision tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "harvest-readiness",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: readinessTaskPlan(outputs, payload)
            });
            if (!result.ok) throw new Error(result.error);
          }
        },
        {
          key: "save-harvest-review",
          label: "Save Harvest Review",
          variant: "secondary",
          pendingLabel: "Saving...",
          disabled: !growId || !payload.harvestBatchId,
          successMessage: "Saved harvest review to batch.",
          onPress: async () => {
            const harvestBatchId = String(payload.harvestBatchId || "").trim();
            const linkedToolRunId = String(toolRun?.id || toolRun?._id || "").trim();
            if (!harvestBatchId) throw new Error("Harvest batch ID is required.");
            if (!linkedToolRunId) throw new Error("A saved ToolRun is required.");
            const batch = await getHarvestBatch(harvestBatchId);
            if (!batch) throw new Error("Harvest batch not found.");
            const existingRecords = Array.isArray(batch.dryCureRecords)
              ? batch.dryCureRecords
              : [];
            const existingRunIds = Array.isArray(batch.linkedToolRunIds)
              ? batch.linkedToolRunIds
              : [];
            const updated = await updateHarvestBatch(harvestBatchId, {
              dryCureRecords: [
                ...existingRecords,
                harvestReviewRecord(outputs, payload, linkedToolRunId)
              ],
              qualityNotes: harvestReviewNotes(outputs, payload),
              linkedToolRunIds: Array.from(new Set([...existingRunIds, linkedToolRunId]))
            });
            if (!updated) throw new Error("Unable to update harvest batch.");
          }
        }
      ]}
    />
  );
}

const photoStyles = StyleSheet.create({
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    borderRadius: radius.card,
    backgroundColor: "#F0FDF4",
    gap: 10
  },
  title: { fontSize: 17, fontWeight: "800", color: "#14532D" },
  help: { color: "#475569", lineHeight: 19 },
  checklist: {
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 5
  },
  checklistTitle: { color: "#14532D", fontWeight: "800" },
  checklistItem: { color: "#334155", fontSize: 12, lineHeight: 18 },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  previewWrap: { flexBasis: 150, flexGrow: 1, maxWidth: 240, minWidth: 130 },
  preview: {
    width: "100%",
    height: 150,
    borderRadius: radius.card,
    backgroundColor: "#E2E8F0"
  },
  removeButton: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 5,
    paddingVertical: 7
  },
  removeText: { color: "#991B1B", fontSize: 12, fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    padding: 10
  },
  button: {
    borderRadius: radius.card,
    backgroundColor: "#166534",
    padding: 12,
    alignItems: "center"
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.45 },
  warning: { color: "#B45309", fontWeight: "700" },
  feedback: { color: "#334155" },
  analysis: {
    borderTopColor: "#BBF7D0",
    borderTopWidth: 1,
    gap: 6,
    paddingTop: 10
  },
  analysisTitle: { color: "#14532D", fontSize: 15, fontWeight: "800" },
  recommendation: { color: "#1E293B", fontWeight: "700", lineHeight: 19 }
});
