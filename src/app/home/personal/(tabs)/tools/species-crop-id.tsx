import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
import { savePersonalGrowCropIdentity } from "@/api/grows";
import { savePersonalPlantCropIdentity } from "@/api/plants";
import type { EvidenceAsset } from "@/types/evidence";

function normalizePriority(
  value: unknown,
  fallback: "low" | "medium" | "high" = "medium"
) {
  return value === "low" || value === "medium" || value === "high" ? value : fallback;
}

function cropIdentityCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "crop_identity_followup",
    sourceStage,
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
}

function speciesCropTaskPlan(outputs: Record<string, any>) {
  const planned = Array.isArray(outputs.tasksToCreate) ? outputs.tasksToCreate : [];
  if (planned.length) {
    return planned.slice(0, 8).map((task: any, index: number) => ({
      title: String(task?.title || `Crop identity follow-up ${index + 1}`),
      priority: normalizePriority(task?.priority),
      dueDate: tomorrow(Number(task?.dueInDays || index + 1)),
      ...cropIdentityCalendarMetadata(
        String(task?.sourceStage || `crop_identity_followup_${index + 1}`)
      ),
      description:
        task?.description ||
        "Follow up on crop identity before applying crop-specific diagnosis, nutrition, IPM, or environment guidance."
    }));
  }

  const needsConfirm = Boolean(outputs.userConfirmationRequired);
  const crop = outputs.likelyCrop || outputs.scientificName || "crop";

  return [
    {
      title: needsConfirm ? "Confirm crop identity" : "Save crop identity to profile",
      priority: needsConfirm ? ("high" as const) : ("medium" as const),
      dueDate: tomorrow(1),
      ...cropIdentityCalendarMetadata("crop_identity_confirmation"),
      description:
        outputs.recommendationContext ||
        `Confirm ${crop} identity and save the crop profile before using crop-specific guidance.`
    },
    {
      title: "Review crop-specific tool targets",
      priority: "medium" as const,
      dueDate: tomorrow(2),
      ...cropIdentityCalendarMetadata("crop_tool_target_review"),
      description:
        "Check whether diagnosis prompts, pH/EC ranges, VPD targets, nutrient assumptions, and IPM context should change for this crop identity."
    },
    {
      title: "Update grow or plant tags",
      priority: "medium" as const,
      dueDate: tomorrow(3),
      ...cropIdentityCalendarMetadata("crop_profile_tag_update"),
      description:
        "Attach confirmed common names, scientific name, cultivar, grow interests, and privacy-safe notes to the grow or plant record."
    }
  ];
}

export default function SpeciesCropIdToolRoute() {
  const [evidenceAssets, setEvidenceAssets] = useState<EvidenceAsset[]>([]);
  return (
    <BackendCalculatorToolScreen
      tool="species-crop-id"
      toolKey="species-crop-id"
      title="Species / Crop Identification"
      subtitle="Identify a crop from uploaded photos or entered traits. A grow is optional and only adds private history or a place to save the confirmed result."
      growOptional
      noGrowContextMessage="Identification is complete and remains in Saved Runs. Attach a grow only to add it to grow or plant history, save a grow log, or create follow-up tasks."
      formHeader={({ growId }) => (
        <View style={styles.evidenceSection}>
          <Text style={styles.evidenceTitle}>Add identification photos</Text>
          <Text style={styles.evidenceGuidance}>
            When available, start with the whole plant, then add sharp close-ups of
            leaves, stems, flowers, fruit, or other identifying structures. A recognizable
            flower or harvested bud can support a crop-level result; appearance cannot
            prove a cultivar or strain.
          </Text>
          <MediaEvidencePicker
            aiUsable
            maxPhotos={10}
            allowVideo
            maxVideoSeconds={30}
            purpose="other"
            sourceContext={{ growId: growId || undefined }}
            value={evidenceAssets}
            onChange={setEvidenceAssets}
          />
        </View>
      )}
      aiPrefill={{
        buttonLabel: "Identify Crop from Photos",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        isReady: () => providerEvidencePayload(evidenceAssets).images.length > 0,
        notReadyMessage: "Upload at least one photo before starting AI identification.",
        runAfterPrefill: true,
        buildMessage: () =>
          `Inspect the attached image pixels first, then use selected private grow or plant context only when it was provided. Identify the crop at the most defensible common-name and species level. Cannabis is an allowed crop candidate. A clear cannabis flower or harvested bud can support a draft identification of Cannabis when visible bracts/calyxes, pistils, resinous sugar leaves, trichome coverage, and inflorescence structure are consistent; do not require a fan-leaf photo when the flower itself is recognizable. Never infer a cultivar or strain from appearance. If image pixels are unavailable, set imageAnalysisPerformed to "false" and do not claim a visual identification. Return JSON only with exactly these keys: {"userEnteredName":"string","scientificName":"string","cultivar":"string","commonNames":"string","identificationNotes":"string","imageAnalysisPerformed":"true or false","imageQuality":"usable, limited, or unusable","visualConfidence":"high, medium, or low","identifyingVisualTraits":"string"}. Use "not confirmed" only when crop-level evidence is insufficient, and leave scientificName blank when uncertain. Every AI result is a draft because only the user can confirm it. In identificationNotes state visible traits, competing candidates, confidence limitations, and the exact whole-plant/leaf/flower/fruit/stem media needed for a better identification. Do not suggest public posting or external reporting.`,
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
              provider: response.provider || "assistant",
              providerLabel: response.providerLabel || "AI crop identity review",
              confidence: String(parsed.visualConfidence || "low").toLowerCase(),
              quality: String(parsed.imageQuality || "limited").toLowerCase(),
              identifyingVisualTraits: String(
                parsed.identifyingVisualTraits || ""
              ).trim(),
              evidenceUsed,
              limitations
            }
          };
        }
      }}
      fields={[
        { key: "userEnteredName", label: "Plant or crop name", defaultValue: "" },
        {
          key: "scientificName",
          label: "Scientific name, if known",
          defaultValue: ""
        },
        { key: "cultivar", label: "Cultivar / strain", defaultValue: "" },
        {
          key: "commonNames",
          label: "Common names, comma-separated",
          defaultValue: ""
        },
        {
          key: "identificationNotes",
          label: "Identification evidence or additional context (optional)",
          defaultValue: "",
          multiline: true
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        userEnteredName: values.userEnteredName,
        scientificName: values.scientificName,
        cultivar: values.cultivar,
        userConfirmed: false,
        commonNames: values.commonNames,
        identificationNotes: values.identificationNotes || undefined,
        evidenceAssetIds: providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        mediaEvidence: providerEvidencePayload(evidenceAssets).media
      })}
      buildMetrics={(outputs) => [
        { key: "crop", label: "Likely crop", value: outputs.likelyCrop },
        { key: "scientific", label: "Scientific", value: outputs.scientificName || "-" },
        { key: "confidence", label: "Confidence", value: outputs.confidence },
        {
          key: "vision",
          label: "Photo analyzed",
          value: outputs.imageAnalysis?.performed ? "Yes" : "No"
        },
        {
          key: "confirm",
          label: "Needs confirm",
          value: outputs.userConfirmationRequired ? "Yes" : "No"
        }
      ]}
      buildNotices={(outputs) => {
        const warnings = Array.isArray(outputs.warnings) ? outputs.warnings : [];
        return [
          {
            key: "image-analysis-status",
            severity: outputs.imageAnalysis?.performed
              ? ("info" as const)
              : ("medium" as const),
            message: outputs.imageAnalysis?.performed
              ? `${outputs.imageAnalysis.providerLabel || "AI vision"} inspected the uploaded photo pixels. The result is still a draft until you confirm it.`
              : outputs.imageAnalysis?.requested
                ? "The uploaded photo pixels were not analyzed. Try again with the image-capable AI available, or enter visible traits manually."
                : "No photo was analyzed. This result uses only the information entered in the form."
          },
          ...warnings.map((message: unknown, index: number) => ({
            key: `warning-${index}`,
            severity: "medium" as const,
            message: String(message)
          }))
        ];
      }}
      defaultLogTitle={(outputs) =>
        `Crop identity: ${outputs.likelyCrop || "unconfirmed crop"}`
      }
      defaultTask={(outputs) => ({
        title: outputs.userConfirmationRequired
          ? "Confirm crop identity"
          : "Review crop profile context",
        description:
          outputs.recommendationContext ||
          "Confirm species/crop profile before applying crop-specific guidance.",
        priority: outputs.userConfirmationRequired ? "high" : "medium",
        ...cropIdentityCalendarMetadata("crop_identity_confirmation")
      })}
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => {
        const cropCommonName = String(
          outputs.likelyCrop || payload.userEnteredName || ""
        ).trim();
        const invalidIdentity = !cropCommonName || /^unknown crop$/i.test(cropCommonName);
        const target = plantContext.plantId ? "Plant" : "Grow";
        const identity = {
          growId,
          cropCommonName,
          scientificName: String(
            outputs.scientificName || payload.scientificName || ""
          ).trim(),
          commonNames:
            outputs.commonNames ||
            String(payload.commonNames || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          cultivar: String(outputs.cultivarOrStrain || payload.cultivar || "").trim(),
          cropProfileId: outputs.cropProfileSuggestion?.cropProfileId || null,
          confidence: "user_confirmed",
          sourceToolRunId: String(toolRun?.id || toolRun?._id || "") || null,
          userConfirmed: true as const
        };

        if (!growId) return [];

        return [
          {
            key: "confirm-save-crop-identity",
            label: `Confirm & Save to ${target}`,
            pendingLabel: "Saving...",
            disabled: invalidIdentity,
            successMessage: `Confirmed crop identity saved to ${target.toLowerCase()}.`,
            onPress: async () => {
              if (plantContext.plantId) {
                await savePersonalPlantCropIdentity(plantContext.plantId, identity);
              } else {
                await savePersonalGrowCropIdentity(growId, identity);
              }
            }
          },
          {
            key: "create-crop-identity-tasks",
            label: "Create Crop Identity Tasks",
            variant: "secondary",
            pendingLabel: "Creating...",
            successMessage: "Created crop identity tasks.",
            onPress: async () => {
              const result = await saveToolRunAndCreateTasks({
                growId,
                ...plantContext.toolRunContext,
                toolKey: "species-crop-id",
                toolRunId: toolRun?.id || toolRun?._id,
                input: payload,
                output: outputs,
                tasks: speciesCropTaskPlan(outputs)
              });
              if (!result.ok) throw new Error(result.error);
            }
          }
        ];
      }}
    />
  );
}

const styles = StyleSheet.create({
  evidenceSection: { gap: 8 },
  evidenceTitle: { color: "#0F172A", fontSize: 15, fontWeight: "800" },
  evidenceGuidance: { color: "#475569", lineHeight: 19 }
});
