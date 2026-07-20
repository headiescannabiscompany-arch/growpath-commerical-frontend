import React, { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
import { uploadImage } from "@/api/uploads";
import { radius } from "@/theme/theme";

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
  initialAnalysis,
  onAnalysis
}: {
  growId: string;
  initialAnalysis: TrichomeVisionResult | null;
  onAnalysis: (result: TrichomeVisionResult | null) => void;
}) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [analysis, setAnalysis] = useState<TrichomeVisionResult | null>(initialAnalysis);

  async function pickPhoto() {
    setFeedback("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback("Photo-library permission is required.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      allowsEditing: false,
      quality: 0.9
    });
    const uris = picked.assets
      ?.map((asset) => asset.uri)
      .filter(Boolean)
      .slice(0, 10);
    if (picked.canceled || !uris?.length) return;
    setAnalysis(null);
    onAnalysis(null);
    setPreviews(uris);
    setImageUrls([]);
    setBusy(true);
    try {
      const uploaded = await Promise.all(uris.map((uri) => uploadImage(uri)));
      const urls = uploaded.map((item) => item?.url).filter(Boolean);
      if (urls.length !== uris.length)
        throw new Error("One or more uploads returned no URL.");
      setImageUrls(urls);
      setFeedback(
        `${urls.length} photo${urls.length === 1 ? "" : "s"} uploaded. Run photo analysis next.`
      );
    } catch (error: any) {
      onAnalysis(null);
      setFeedback(
        harvestPhotoRecoveryMessage(
          error?.message
            ? `Photo upload failed: ${error.message}`
            : "Photo upload failed."
        )
      );
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    if (!growId || !imageUrls.length || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const result = await analyzeTrichomePhotos({
        growId,
        images: imageUrls,
        sampleLocation: "mixed_bud_sites",
        notes: notes.trim() || undefined
      });
      setAnalysis(result);
      onAnalysis(result);
      setFeedback(
        result.photoUsable
          ? `Photo analyzed with ${Math.round(result.confidence * 100)}% confidence. The clear, cloudy, and amber fields below are filled. Review the other maturity signals, then run the rule-based readiness estimate.`
          : [
              "These photos are not reliable enough to fill the readiness fields.",
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
        If photo analysis succeeds, it estimates the three trichome percentages below. It
        does not make the harvest decision by itself. Use sharp macro photos of gland
        heads on bud calyxes and confirm across several bud sites.
      </Text>
      <View style={photoStyles.checklist} accessibilityLabel="Harvest photo checklist">
        <Text style={photoStyles.checklistTitle}>Photo checklist before analysis</Text>
        {HARVEST_PHOTO_CHECKLIST.map((item, index) => (
          <Text key={item} style={photoStyles.checklistItem}>
            {index + 1}. {item}
          </Text>
        ))}
      </View>
      <Pressable
        accessibilityLabel="Choose harvest trichome photo"
        onPress={pickPhoto}
        disabled={busy || !growId}
        style={[photoStyles.button, (busy || !growId) && photoStyles.disabled]}
      >
        <Text style={photoStyles.buttonText}>
          {imageUrls.length ? "Change Photos" : "Choose Photos (up to 10)"}
        </Text>
      </Pressable>
      {previews.length ? (
        <View style={photoStyles.previewGrid}>
          {previews.map((uri, index) => (
            <View key={`${uri}-${index}`} style={photoStyles.previewWrap}>
              <Image source={{ uri }} style={photoStyles.preview} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove trichome photo ${index + 1}`}
                onPress={() => {
                  setPreviews((current) => current.filter((_, item) => item !== index));
                  setImageUrls((current) => current.filter((_, item) => item !== index));
                  setAnalysis(null);
                  onAnalysis(null);
                  setFeedback(
                    "Photo removed. Run analysis again after the remaining photos meet the checklist."
                  );
                }}
                style={photoStyles.removeButton}
              >
                <Text style={photoStyles.removeText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
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
        disabled={busy || !growId || !imageUrls.length}
        style={[
          photoStyles.button,
          (busy || !growId || !imageUrls.length) && photoStyles.disabled
        ]}
      >
        <Text style={photoStyles.buttonText}>
          {busy ? "Working..." : "Analyze Photo with AI"}
        </Text>
      </Pressable>
      {!growId ? (
        <Text style={photoStyles.warning}>Select a grow before analyzing a photo.</Text>
      ) : null}
      {!previews.length ? (
        <Text style={photoStyles.warning}>
          No trichome photos selected. Choose macro photos that meet the checklist;
          ordinary whole-plant photos cannot support clear/cloudy/amber percentages.
        </Text>
      ) : imageUrls.length < 3 ? (
        <Text style={photoStyles.warning}>
          Add photos from more bud sites when possible. One sample can miss differences
          between top, middle, and lower buds.
        </Text>
      ) : null}
      {feedback ? <Text style={photoStyles.feedback}>{feedback}</Text> : null}
      {analysis ? (
        <View
          accessibilityLabel="Harvest photo analysis result"
          style={photoStyles.analysis}
        >
          <Text style={photoStyles.analysisTitle}>
            {analysis.photoUsable ? "Photo quality: usable" : "Better photos needed"}
          </Text>
          <Text style={photoStyles.feedback}>
            Confidence: {Math.round(analysis.confidence * 100)}%
          </Text>
          {analysis.photoUsable ? (
            <Text style={photoStyles.feedback}>
              AI estimate: {Math.round(analysis.cloudy * 100)}% cloudy,{" "}
              {Math.round(analysis.amber * 100)}% amber,{" "}
              {Math.round(analysis.clear * 100)}% clear.
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
          {(analysis.evidence || []).map((item, index) => (
            <Text key={`evidence-${index}`} style={photoStyles.feedback}>
              • {item}
            </Text>
          ))}
          {(analysis.limitations || []).map((item, index) => (
            <Text key={`limitation-${index}`} style={photoStyles.warning}>
              • {item}
            </Text>
          ))}
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
      subtitle="Rule-based estimate from the values below. Successful photo analysis can fill trichome percentages; failed photo analysis does not affect the estimate. Confirm the decision across multiple bud sites and whole-plant maturity signals."
      aiPrefill={{
        buttonLabel: "Fill readiness review from grow",
        clearUnfilled: true,
        buildMessage: () =>
          `Prefill a Harvest Readiness review using the selected grow and plant's saved timeline, breeder/cultivar information, logs, photos and prior vision results, environment, tasks, diagnoses, and harvest records. Return JSON only with exactly these keys: {"flowerDay":"string","breederFlowerTime":"string","cloudyPercent":"string","amberPercent":"string","clearPercent":"string","pistilStatus":"string","budSwellStatus":"string","sampleLocation":"string","harvestBatchId":"string","aromaIntensity":"string","userGoal":"string","additionalInformation":"string"}. Never infer trichome percentages from ordinary plant photos; fill them only from a saved usable macro-photo analysis. If current media is missing, blurry, lacks visible trichome heads, or covers too few bud sites, leave those percentages blank and explain exactly which better photos are needed in additionalInformation. Leave unknown observations blank rather than inventing them.`
      }}
      formHeader={({ growId }) => (
        <HarvestPhotoAnalyzer
          growId={growId}
          initialAnalysis={vision}
          onAnalysis={setVision}
        />
      )}
      fields={[
        {
          key: "flowerDay",
          label: "Flower day",
          defaultValue: "56",
          keyboardType: "numeric"
        },
        {
          key: "breederFlowerTime",
          label: "Breeder timeline day (for example 65)",
          defaultValue: "63",
          keyboardType: "numeric"
        },
        {
          key: "cloudyPercent",
          label: "Cloudy %",
          defaultValue: vision?.photoUsable
            ? String(Math.round(vision.cloudy * 100))
            : "",
          keyboardType: "numeric"
        },
        {
          key: "amberPercent",
          label: "Amber %",
          defaultValue: vision?.photoUsable ? String(Math.round(vision.amber * 100)) : "",
          keyboardType: "numeric"
        },
        {
          key: "clearPercent",
          label: "Clear %",
          defaultValue: vision?.photoUsable ? String(Math.round(vision.clear * 100)) : "",
          keyboardType: "numeric"
        },
        {
          key: "pistilStatus",
          label: "Hair / pistil status (fresh, dying, dark, receded)",
          defaultValue: "mixed"
        },
        {
          key: "budSwellStatus",
          label: "Bud structure (still developing or fully finished)",
          defaultValue: "mostly_swollen"
        },
        {
          key: "sampleLocation",
          label: "Trichome sample location",
          defaultValue: "mixed_bud_sites"
        },
        {
          key: "harvestBatchId",
          label: "Harvest batch ID (optional)",
          defaultValue: ""
        },
        {
          key: "aromaIntensity",
          label: "Aroma trend (building, peak, or dropping)",
          defaultValue: "building"
        },
        {
          key: "userGoal",
          label: "Effect goal (saved as context; not scored yet)",
          defaultValue: "balanced"
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
        photoAnalysisConfidence: vision?.photoUsable ? vision.confidence : undefined,
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
          value: vision?.photoUsable
            ? `AI photo estimate (${Math.round(vision.confidence * 100)}% confidence)`
            : "Manual form entry; photos were not used"
        },
        {
          key: "aroma-advice",
          label: "Smell / flavor",
          value: outputs.aromaFlavorInterpretation
        }
      ]}
      buildNotices={(outputs) =>
        Array.isArray(outputs.warnings)
          ? outputs.warnings.map((message: string, index: number) => ({
              key: `warning-${index}`,
              severity: "medium" as const,
              message
            }))
          : []
      }
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
