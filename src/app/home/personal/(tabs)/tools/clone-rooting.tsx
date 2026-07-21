import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import type { EvidenceAsset } from "@/types/evidence";
import { radius } from "@/theme/theme";

function measuredNumber(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : trimmed;
}

function optionalNumber(value: unknown) {
  if (value == null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function metric(value: unknown, suffix = "") {
  return value == null || value === "" ? "Not assessed" : `${value}${suffix}`;
}

function numberOrFallback(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cloneCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "clone_rooting_followup",
    sourceStage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
}

function normalizeAiField(value: unknown) {
  const text = String(value == null ? "" : value).trim();
  if (
    /^(unknown|not known|not provided|not recorded|not available|not determined|n\/a)$/i.test(
      text
    )
  ) {
    return "";
  }
  return text;
}

function cloneRootingTaskPlan(
  outputs: Record<string, any>,
  payload: Record<string, any>
) {
  const cloneCount = numberOrFallback(payload.cloneCount, 0);
  const rootedCount = numberOrFallback(payload.rootedCount, 0);
  const failedCount = numberOrFallback(payload.failedCount, 0);
  const pendingCount = Math.max(0, cloneCount - rootedCount - failedCount);
  const daysSinceCut = numberOrFallback(payload.daysSinceCut, 0);
  const followUpDueDays = numberOrFallback(outputs.followUpTask?.dueInDays, 2);
  const bottlenecks = Array.isArray(outputs.likelyBottlenecks)
    ? outputs.likelyBottlenecks
        .slice(0, 3)
        .map((item: any) => item?.issue || item)
        .join("; ")
    : "";
  const batchSummary = [
    `Day ${daysSinceCut}: ${rootedCount}/${cloneCount} visibly rooted, ${failedCount} failed, ${pendingCount} pending.`,
    payload.measuredAt ? `Measured at: ${payload.measuredAt}.` : "",
    payload.measurementSource ? `Source: ${payload.measurementSource}.` : "",
    "Elapsed time and top growth do not prove hidden roots."
  ]
    .filter(Boolean)
    .join("\n");

  return [
    {
      title: outputs.followUpTask?.title || "Recheck clone batch evidence",
      priority: outputs.followUpTask?.priority || "medium",
      dueDate: tomorrow(followUpDueDays),
      ...cloneCalendarMetadata("clone_rooting"),
      description: [batchSummary, bottlenecks ? `Review: ${bottlenecks}` : ""]
        .filter(Boolean)
        .join("\n")
    },
    {
      title: "Photograph tray, stem bases, and visible roots",
      priority: "medium" as const,
      dueDate: tomorrow(followUpDueDays),
      ...cloneCalendarMetadata("clone_photo_review"),
      description:
        "Capture a tray-wide pattern, representative healthy and weak cuts, stem bases, and only roots that are directly visible."
    },
    {
      title:
        outputs.riskLevel === "high"
          ? "Isolate affected cuts and verify clone conditions"
          : "Verify clone conditions before changing the tray",
      priority: outputs.riskLevel === "high" ? ("high" as const) : ("medium" as const),
      dueDate: tomorrow(1),
      ...cloneCalendarMetadata("clone_environment_review"),
      description:
        "Measure RH, air and plug temperature, PPFD, photoperiod, and medium moisture at the same time; review sanitation and donor health before making a batch-wide change."
    },
    {
      title: "Update clone survival and transplant decision",
      priority: "medium" as const,
      dueDate: tomorrow(Math.max(3, followUpDueDays + 3)),
      ...cloneCalendarMetadata("clone_transplant_decision"),
      description:
        "Recount visibly rooted, failed, callused, wilted, and pending cuts. Transplant only after direct root inspection and record the final outcome by mother and batch."
    }
  ];
}

export default function CloneRootingToolRoute() {
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  const evidencePayload = useMemo(
    () => providerEvidencePayload(evidenceAssets),
    [evidenceAssets]
  );

  return (
    <BackendCalculatorToolScreen
      tool="clone-rooting"
      toolKey="clone-rooting"
      title="Clone Rooting Troubleshooter"
      subtitle="Review a real cutting batch from counts, direct root evidence, donor health, sanitation, measured conditions, and repeatable follow-up—not silent defaults or hidden-root guesses."
      experienceMessage="This is a cannabis/hemp propagation batch review. It calculates from the counts and measurements you enter, keeps missing evidence unknown, and never treats elapsed time or top growth as proof of hidden roots."
      aiCreditMessage="The batch calculator uses no AI credit. Optional AI photo/grow prefill uses one credit when the provider runs; failed provider calls are refunded. Review every filled field before calculating."
      aiPrefill={{
        buttonLabel: "Analyze clone evidence & prefill (1 AI credit)",
        clearUnfilled: true,
        evidenceAssetIds: () => evidencePayload.evidenceAssetIds,
        buildMessage: () =>
          `Inspect any attached image pixels and the selected cannabis/hemp grow, plant/mother records, clone batch history, environment readings, and logs. Prefill a cautious Clone Rooting batch review. Return JSON only with exactly these string keys: {"daysSinceCut":"","cloneCount":"","rootedCount":"","failedCount":"","callusCount":"","wiltedCount":"","measuredAt":"","measurementSource":"","humidity":"","airTemperature":"","rootZoneTemperature":"","tempUnit":"","lightPpfd":"","photoperiodHours":"","humidityManagement":"","mediumType":"","mediumMoisture":"","motherPlantHealth":"","sanitationStatus":"","stemCondition":"","leafCondition":"","rootEvidence":"","rootingProduct":"","additionalInformation":"","imageAnalysisPerformed":"true or false","imageQuality":"usable, limited, or unusable","visualConfidence":"high, medium, or low"}. Counts, days, dates, sensor values, products, sanitation, donor health, and photoperiod must come from explicit records or user input; never estimate them from a photo. Photo review may describe tray distribution, leaf turgor, stem-base appearance, visible callus, and directly exposed roots. It must never claim hidden roots, name a pathogen from appearance, or turn callus/top growth into rooted status. Leave unknown values blank. Use these canonical values when supported: humidityManagement sealed_dome, vented_dome, intermittent_mist, open_air; mediumMoisture balanced, dry, saturated; motherPlantHealth healthy, stressed, disease_or_pest_concern; sanitationStatus confirmed_clean, concern; stemCondition healthy_stem, callus_visible, darkened, mushy, mixed; leafCondition turgid, mild_wilt, severe_wilt, yellowing, necrosis, mixed; rootEvidence no_visible_roots, callus_visible, roots_visible, mixed, not_checked. additionalInformation must state visible facts, missing evidence, and uncertainty.`,
        normalizeFieldValue: ({ value }) => normalizeAiField(value),
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
              providerLabel: response.providerLabel || "AI clone photo review",
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
      formHeader={({ growId }) => (
        <View style={styles.evidenceSection}>
          <View style={styles.guidanceCard}>
            <Text style={styles.guidanceTitle}>Use one repeatable batch snapshot</Text>
            <Text style={styles.guidanceText}>
              1. Count the full batch using the same definitions: visibly rooted,
              failed/cull, callus-visible, wilted, and still pending.
            </Text>
            <Text style={styles.guidanceText}>
              2. Measure RH, air temperature, plug/root-zone temperature, and PPFD at
              cutting height at the same time. Record the sensor and timestamp.
            </Text>
            <Text style={styles.guidanceText}>
              3. Record the mother, sanitation, dome/mist method, medium, stem bases, leaf
              turgor, and only roots that are directly visible.
            </Text>
            <Text style={styles.guidanceWarning}>
              Photos can document visible patterns. They cannot supply counts or sensor
              values, prove hidden roots, or diagnose a pathogen.
            </Text>
          </View>
          <MediaEvidencePicker
            aiUsable
            maxPhotos={10}
            allowVideo
            maxVideoSeconds={30}
            purpose="clone"
            sourceContext={{ growId: growId || undefined }}
            value={evidenceAssets}
            onChange={setEvidenceAssets}
          />
        </View>
      )}
      fields={[
        {
          key: "daysSinceCut",
          label: "Days since cut",
          defaultValue: "",
          placeholder: "e.g. 8",
          helpText: "Required context, not a rooting or failure deadline.",
          keyboardType: "numeric",
          required: true,
          section: "Batch counts"
        },
        {
          key: "cloneCount",
          label: "Total cuts in batch",
          defaultValue: "",
          placeholder: "e.g. 24",
          helpText: "Count every cutting in this tray or batch.",
          keyboardType: "numeric",
          required: true,
          section: "Batch counts"
        },
        {
          key: "rootedCount",
          label: "Visibly rooted count",
          defaultValue: "",
          placeholder: "Directly visible roots only",
          helpText: "Do not count top growth, resistance to a tug, or callus as roots.",
          keyboardType: "numeric",
          required: true,
          section: "Batch counts"
        },
        {
          key: "failedCount",
          label: "Failed or culled count",
          defaultValue: "",
          placeholder: "Use 0 only after counting",
          helpText:
            "Cuts removed or clearly nonviable; rooted plus failed cannot exceed total.",
          keyboardType: "numeric",
          required: true,
          section: "Batch counts"
        },
        {
          key: "callusCount",
          label: "Visible callus count (optional)",
          defaultValue: "",
          placeholder: "Directly visible callus, not roots",
          keyboardType: "numeric",
          section: "Batch counts"
        },
        {
          key: "wiltedCount",
          label: "Wilted or collapsed count (optional)",
          defaultValue: "",
          placeholder: "Count affected cuts",
          keyboardType: "numeric",
          section: "Batch counts"
        },
        {
          key: "rootEvidence",
          label: "Direct root evidence",
          defaultValue: "",
          placeholder:
            "no_visible_roots, callus_visible, roots_visible, mixed, or not_checked",
          helpText: "Describe what was directly inspected; hidden roots remain unknown.",
          required: true,
          section: "Batch counts"
        },
        {
          key: "measuredAt",
          label: "Measured at",
          defaultValue: "",
          placeholder: "YYYY-MM-DD HH:MM and timezone",
          section: "Measured environment"
        },
        {
          key: "measurementSource",
          label: "Sensor / observation source",
          defaultValue: "",
          placeholder: "Meter model/location and direct count method",
          section: "Measured environment"
        },
        {
          key: "humidity",
          label: "Propagation humidity (% RH)",
          defaultValue: "",
          placeholder: "Measured at cutting height",
          keyboardType: "numeric",
          section: "Measured environment"
        },
        {
          key: "airTemperature",
          label: "Air temperature",
          defaultValue: "",
          placeholder: "Measured at cutting height",
          keyboardType: "numeric",
          section: "Measured environment"
        },
        {
          key: "rootZoneTemperature",
          label: "Plug / root-zone temperature (optional)",
          defaultValue: "",
          placeholder: "Measured in a representative plug",
          keyboardType: "numeric",
          section: "Measured environment"
        },
        {
          key: "tempUnit",
          label: "Temperature unit",
          defaultValue: "F",
          placeholder: "F or C",
          section: "Measured environment"
        },
        {
          key: "lightPpfd",
          label: "PPFD at cutting height",
          defaultValue: "",
          placeholder: "umol/m2/s",
          keyboardType: "numeric",
          section: "Measured environment"
        },
        {
          key: "photoperiodHours",
          label: "Light hours per day",
          defaultValue: "",
          placeholder: "e.g. 18",
          keyboardType: "numeric",
          section: "Measured environment"
        },
        {
          key: "humidityManagement",
          label: "Humidity method",
          defaultValue: "",
          placeholder: "sealed_dome, vented_dome, intermittent_mist, or open_air",
          section: "Method and provenance"
        },
        {
          key: "mediumType",
          label: "Rooting medium / system",
          defaultValue: "",
          placeholder: "e.g. peat plug, rockwool, aeroponic collar",
          section: "Method and provenance"
        },
        {
          key: "mediumMoisture",
          label: "Medium moisture condition",
          defaultValue: "",
          placeholder: "balanced, dry, saturated, or unknown",
          section: "Method and provenance"
        },
        {
          key: "rootingProduct",
          label: "Rooting product / method (optional)",
          defaultValue: "",
          placeholder: "Product and label rate, or none",
          helpText: "Record what was used; GrowPath does not invent hormone dosing.",
          section: "Method and provenance"
        },
        {
          key: "motherPlantHealth",
          label: "Mother plant health",
          defaultValue: "",
          placeholder: "healthy, stressed, disease_or_pest_concern, or unknown",
          section: "Visible observations"
        },
        {
          key: "sanitationStatus",
          label: "Sanitation status",
          defaultValue: "",
          placeholder: "confirmed_clean, concern, or unknown",
          helpText:
            "Consider cutting tool, tray, dome, media, hands/gloves, and reused equipment.",
          section: "Visible observations"
        },
        {
          key: "stemCondition",
          label: "Stem-base condition",
          defaultValue: "",
          placeholder: "healthy_stem, callus_visible, darkened, mushy, mixed, or unknown",
          section: "Visible observations"
        },
        {
          key: "leafCondition",
          label: "Leaf / turgor condition",
          defaultValue: "",
          placeholder:
            "turgid, mild_wilt, severe_wilt, yellowing, necrosis, mixed, or unknown",
          section: "Visible observations"
        },
        {
          key: "additionalInformation",
          label: "Pattern, tray position, changes, and notes (optional)",
          defaultValue: "",
          placeholder:
            "Where weak cuts are located, when the pattern changed, odors/condensation, donor differences, and prior adjustments",
          multiline: true,
          section: "Visible observations"
        }
      ]}
      validateValues={(values) => {
        const required = [
          ["daysSinceCut", "Days since cut"],
          ["cloneCount", "Total cuts in batch"],
          ["rootedCount", "Visibly rooted count"],
          ["failedCount", "Failed or culled count"],
          ["rootEvidence", "Direct root evidence"]
        ].filter(([key]) => !String(values[key] || "").trim());
        if (required.length) {
          return `Complete the required fields: ${required.map(([, label]) => label).join(", ")}.`;
        }
        const wholeCounts = [
          ["daysSinceCut", "Days since cut"],
          ["cloneCount", "Total cuts in batch"],
          ["rootedCount", "Visibly rooted count"],
          ["failedCount", "Failed or culled count"],
          ["callusCount", "Visible callus count"],
          ["wiltedCount", "Wilted or collapsed count"]
        ];
        for (const [key, label] of wholeCounts) {
          const raw = String(values[key] || "").trim();
          if (!raw && ["callusCount", "wiltedCount"].includes(key)) continue;
          const parsed = Number(raw);
          if (!Number.isInteger(parsed) || parsed < 0) {
            return `${label} must be a whole number of zero or greater.`;
          }
        }
        const total = Number(values.cloneCount);
        const rooted = Number(values.rootedCount);
        const failed = Number(values.failedCount);
        const callus = String(values.callusCount || "").trim()
          ? Number(values.callusCount)
          : 0;
        if (total < 1) return "Total cuts in batch must be greater than zero.";
        if (rooted + failed > total) {
          return "Visibly rooted count plus failed count cannot exceed the total cuts.";
        }
        if (callus > total - rooted - failed) {
          return "Visible callus count cannot exceed the unrooted live count.";
        }
        if (
          String(values.wiltedCount || "").trim() &&
          Number(values.wiltedCount) > total
        ) {
          return "Wilted or collapsed count cannot exceed the total cuts.";
        }
        const humidity = String(values.humidity || "").trim();
        if (humidity && (Number(humidity) < 0 || Number(humidity) > 100)) {
          return "Propagation humidity must be between 0 and 100%.";
        }
        for (const [key, label] of [
          ["airTemperature", "Air temperature"],
          ["rootZoneTemperature", "Plug / root-zone temperature"],
          ["lightPpfd", "PPFD"],
          ["photoperiodHours", "Light hours per day"]
        ]) {
          const raw = String(values[key] || "").trim();
          if (raw && !Number.isFinite(Number(raw))) return `${label} must be a number.`;
        }
        if (
          !["F", "C"].includes(
            String(values.tempUnit || "")
              .trim()
              .toUpperCase()
          )
        ) {
          return "Temperature unit must be F or C.";
        }
        if (Number(values.lightPpfd) < 0) return "PPFD cannot be negative.";
        const hours = String(values.photoperiodHours || "").trim();
        if (hours && (Number(hours) <= 0 || Number(hours) > 24)) {
          return "Light hours per day must be greater than 0 and no more than 24.";
        }
        const allowedRootEvidence = [
          "no_visible_roots",
          "callus_visible",
          "roots_visible",
          "mixed",
          "not_checked"
        ];
        if (
          !allowedRootEvidence.includes(String(values.rootEvidence).trim().toLowerCase())
        ) {
          return "Direct root evidence must be no_visible_roots, callus_visible, roots_visible, mixed, or not_checked.";
        }
        return null;
      }}
      buildPayload={(values, { growId, plantContext }) => ({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        daysSinceCut: measuredNumber(values.daysSinceCut),
        cloneCount: measuredNumber(values.cloneCount),
        rootedCount: measuredNumber(values.rootedCount),
        failedCount: measuredNumber(values.failedCount),
        callusCount: measuredNumber(values.callusCount),
        wiltedCount: measuredNumber(values.wiltedCount),
        rootEvidence: values.rootEvidence.trim() || undefined,
        measuredAt: values.measuredAt.trim() || undefined,
        measurementSource: values.measurementSource.trim() || undefined,
        humidity: measuredNumber(values.humidity),
        airTemperature: measuredNumber(values.airTemperature),
        rootZoneTemperature: measuredNumber(values.rootZoneTemperature),
        tempUnit: values.tempUnit.trim().toUpperCase(),
        lightPpfd: measuredNumber(values.lightPpfd),
        photoperiodHours: measuredNumber(values.photoperiodHours),
        humidityManagement: values.humidityManagement.trim() || undefined,
        mediumType: values.mediumType.trim() || undefined,
        mediumMoisture: values.mediumMoisture.trim() || undefined,
        rootingProduct: values.rootingProduct.trim() || undefined,
        motherPlantHealth: values.motherPlantHealth.trim() || undefined,
        sanitationStatus: values.sanitationStatus.trim() || undefined,
        stemCondition: values.stemCondition.trim() || undefined,
        leafCondition: values.leafCondition.trim() || undefined,
        additionalInformation: values.additionalInformation.trim() || undefined,
        evidenceAssetIds: evidencePayload.evidenceAssetIds,
        mediaEvidence: evidencePayload.media
      })}
      buildMetrics={(outputs) => [
        {
          key: "assessment",
          label: "Evidence status",
          value: outputs.assessmentStatus || "Not assessed"
        },
        {
          key: "risk",
          label: "Batch concern",
          value: outputs.riskLevel || "Not assessed"
        },
        {
          key: "progress",
          label: "Visible progress",
          value: outputs.rootingProgress || "Not assessed"
        },
        {
          key: "rooted",
          label: "Visibly rooted",
          value: outputs.batchCounts
            ? `${outputs.batchCounts.rooted}/${outputs.batchCounts.total} (${outputs.clonePerformanceSummary?.rootingPercent ?? 0}%)`
            : "Not assessed"
        },
        {
          key: "failed",
          label: "Failed / culled",
          value: outputs.batchCounts
            ? `${outputs.batchCounts.failed}/${outputs.batchCounts.total} (${outputs.clonePerformanceSummary?.failurePercent ?? 0}%)`
            : "Not assessed"
        },
        {
          key: "pending",
          label: "Still pending",
          value: outputs.batchCounts
            ? `${outputs.batchCounts.pending}/${outputs.batchCounts.total}`
            : "Not assessed"
        },
        {
          key: "humidity",
          label: "Measured RH",
          value: metric(outputs.environmentSnapshot?.humidityRh, "%")
        },
        {
          key: "light",
          label: "Measured PPFD",
          value: metric(outputs.environmentSnapshot?.lightPpfd, " umol/m2/s")
        },
        {
          key: "media",
          label: "Photo analysis",
          value: outputs.mediaAnalysis?.status || "No photos submitted"
        }
      ]}
      buildNotices={(outputs) => {
        const bottlenecks = Array.isArray(outputs.likelyBottlenecks)
          ? outputs.likelyBottlenecks.slice(0, 6).map((item: any, index: number) => ({
              key: `bottleneck-${item.key || index}`,
              severity: ["high", "medium", "low"].includes(item.severity)
                ? item.severity
                : "medium",
              message: [item.issue, item.evidence].filter(Boolean).join(" "),
              remediation: Array.isArray(item.recommendations)
                ? item.recommendations.join(" ")
                : undefined
            }))
          : [];
        const missing = Array.isArray(outputs.missingInformation)
          ? outputs.missingInformation.filter(Boolean)
          : [];
        const mediaLimitations = Array.isArray(outputs.mediaAnalysis?.limitations)
          ? outputs.mediaAnalysis.limitations.filter(Boolean)
          : [];
        return [
          ...bottlenecks,
          ...(missing.length
            ? [
                {
                  key: "missing-clone-evidence",
                  severity: "medium" as const,
                  message: `Still needed for a complete measured review: ${missing.join(", ")}.`
                }
              ]
            : []),
          {
            key: "root-clock-limitation",
            severity: "info" as const,
            message:
              "Elapsed time and top growth do not prove hidden roots or automatic failure. Count only directly visible roots and keep callus separate."
          },
          ...(outputs.mediaAnalysis?.performed
            ? [
                {
                  key: "clone-media-provenance",
                  severity: "info" as const,
                  message: `${outputs.mediaAnalysis.providerLabel || "AI clone photo review"} inspected ${outputs.mediaAnalysis.photosAnalyzed || 0} photo(s). Quality: ${outputs.mediaAnalysis.quality || "not provided"}.`
                }
              ]
            : []),
          ...mediaLimitations.slice(0, 2).map((message: string, index: number) => ({
            key: `clone-media-limit-${index}`,
            severity: "info" as const,
            message
          }))
        ];
      }}
      defaultLogTitle={() => "Clone rooting batch check"}
      defaultTask={(outputs) => ({
        title: outputs.followUpTask?.title || "Recheck clone batch evidence",
        priority: outputs.followUpTask?.priority || "medium",
        dueDate: tomorrow(outputs.followUpTask?.dueInDays || 2),
        ...cloneCalendarMetadata("clone_rooting"),
        description:
          outputs.nextAction ||
          "Recount the batch, remeasure conditions, and inspect only directly visible roots."
      })}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-clone-rooting-tasks",
          label: "Create Clone Follow-up Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
          successMessage: "Created clone follow-up tasks.",
          onPress: async () => {
            const result = await saveToolRunAndCreateTasks({
              growId,
              ...plantContext.toolRunContext,
              toolKey: "clone-rooting",
              toolRunId: toolRun?.id || toolRun?._id,
              input: payload,
              output: outputs,
              tasks: cloneRootingTaskPlan(outputs, payload)
            });
            if (!result.ok) throw new Error(result.error);
          }
        }
      ]}
    />
  );
}

const styles = StyleSheet.create({
  evidenceSection: { gap: 12 },
  guidanceCard: {
    gap: 7,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    backgroundColor: "#F0FDF4",
    padding: 14
  },
  guidanceTitle: { color: "#14532D", fontSize: 16, fontWeight: "800" },
  guidanceText: { color: "#334155", fontSize: 13, lineHeight: 19 },
  guidanceWarning: { color: "#92400E", fontSize: 13, fontWeight: "700", lineHeight: 19 }
});
