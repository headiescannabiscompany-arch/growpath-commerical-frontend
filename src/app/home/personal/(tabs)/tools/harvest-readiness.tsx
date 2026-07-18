import React, { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
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

function routeValue(value?: string | string[]) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function HarvestPhotoAnalyzer({
  onAnalysis
}: {
  onAnalysis: (result: TrichomeVisionResult) => void;
}) {
  const params = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = routeValue(params.growId);
  const [preview, setPreview] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function pickPhoto() {
    setFeedback("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFeedback("Photo-library permission is required.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    const uri = picked.assets[0].uri;
    setPreview(uri);
    setBusy(true);
    try {
      const uploaded = await uploadImage(uri);
      if (!uploaded?.url) throw new Error("Photo upload returned no URL.");
      setImageUrl(uploaded.url);
      setFeedback("Photo uploaded. Run photo analysis next.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to upload photo.");
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    if (!growId || !imageUrl || busy) return;
    setBusy(true);
    setFeedback("");
    try {
      const result = await analyzeTrichomePhotos({
        growId,
        images: [imageUrl],
        sampleLocation: "mixed_bud_sites",
        notes: notes.trim() || undefined
      });
      onAnalysis(result);
      setFeedback(
        result.photoUsable
          ? `Photo analyzed with ${Math.round(result.confidence * 100)}% confidence.`
          : "The photo is not clear enough for trichome analysis. Retake a sharp macro photo of bud calyxes."
      );
    } catch (error: any) {
      setFeedback(error?.message || "Unable to analyze the trichome photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={photoStyles.card}>
      <Text style={photoStyles.title}>AI trichome photo detector</Text>
      <Text style={photoStyles.help}>
        Start with a sharp macro photo of trichome heads on a bud calyx. The AI result
        fills the readiness percentages below; confirm across several bud sites.
      </Text>
      <Pressable
        accessibilityLabel="Choose harvest trichome photo"
        onPress={pickPhoto}
        disabled={busy || !growId}
        style={[photoStyles.button, (busy || !growId) && photoStyles.disabled]}
      >
        <Text style={photoStyles.buttonText}>
          {imageUrl ? "Change Photo" : "Choose Photo"}
        </Text>
      </Pressable>
      {preview ? <Image source={{ uri: preview }} style={photoStyles.preview} /> : null}
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
        disabled={busy || !growId || !imageUrl}
        style={[
          photoStyles.button,
          (busy || !growId || !imageUrl) && photoStyles.disabled
        ]}
      >
        <Text style={photoStyles.buttonText}>
          {busy ? "Working..." : "Analyze Photo with AI"}
        </Text>
      </Pressable>
      {!growId ? (
        <Text style={photoStyles.warning}>Select a grow before analyzing a photo.</Text>
      ) : null}
      {feedback ? <Text style={photoStyles.feedback}>{feedback}</Text> : null}
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
    <View style={{ flex: 1 }}>
      <HarvestPhotoAnalyzer onAnalysis={setVision} />
      <BackendCalculatorToolScreen
        key={vision ? `${vision.clear}-${vision.cloudy}-${vision.amber}` : "manual"}
        tool="harvest-readiness"
        toolKey="harvest-readiness"
        title="Harvest Readiness AI"
        subtitle="Estimate harvest readiness from flower day, breeder timing, trichome mix, aroma, and user goals."
        fields={[
          {
            key: "flowerDay",
            label: "Flower day",
            defaultValue: "56",
            keyboardType: "numeric"
          },
          {
            key: "breederFlowerTime",
            label: "Breeder flower time",
            defaultValue: "63",
            keyboardType: "numeric"
          },
          {
            key: "cloudyPercent",
            label: "Cloudy %",
            defaultValue: vision ? String(Math.round(vision.cloudy * 100)) : "65",
            keyboardType: "numeric"
          },
          {
            key: "amberPercent",
            label: "Amber %",
            defaultValue: vision ? String(Math.round(vision.amber * 100)) : "8",
            keyboardType: "numeric"
          },
          {
            key: "clearPercent",
            label: "Clear %",
            defaultValue: vision ? String(Math.round(vision.clear * 100)) : "10",
            keyboardType: "numeric"
          },
          { key: "pistilStatus", label: "Pistil / hair status", defaultValue: "mixed" },
          {
            key: "budSwellStatus",
            label: "Bud / calyx swell",
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
          { key: "aromaIntensity", label: "Aroma intensity", defaultValue: "building" },
          { key: "userGoal", label: "Effect goal", defaultValue: "balanced" }
        ]}
        buildPayload={(values, { growId, plantContext }) => ({
          growId,
          ...plantContext.toolRunContext,
          ...values,
          harvestBatchId: values.harvestBatchId.trim() || undefined
        })}
        buildMetrics={(outputs) => [
          { key: "status", label: "Readiness", value: outputs.readinessStatus },
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
            label: "Bud swell",
            value: outputs.wholePlantMaturity?.budSwellStatus
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
                linkedToolRunIds: Array.from(
                  new Set([...existingRunIds, linkedToolRunId])
                )
              });
              if (!updated) throw new Error("Unable to update harvest batch.");
            }
          }
        ]}
      />
    </View>
  );
}

const photoStyles = StyleSheet.create({
  card: {
    margin: 16,
    marginBottom: 0,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    borderRadius: radius.card,
    backgroundColor: "#F0FDF4",
    gap: 10
  },
  title: { fontSize: 17, fontWeight: "800", color: "#14532D" },
  help: { color: "#475569", lineHeight: 19 },
  preview: {
    width: "100%",
    height: 220,
    borderRadius: radius.card,
    backgroundColor: "#E2E8F0"
  },
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
  feedback: { color: "#334155" }
});
