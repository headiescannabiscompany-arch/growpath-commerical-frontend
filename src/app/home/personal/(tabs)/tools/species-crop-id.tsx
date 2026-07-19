import React, { useState } from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import MediaEvidencePicker from "@/components/media/MediaEvidencePicker";
import { providerEvidencePayload } from "@/api/evidence";
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
      priority: needsConfirm ? "high" : ("medium" as const),
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
      subtitle="Use private grow context and media to suggest crop identity for diagnosis, nutrient, environment, and IPM context. AI suggestions always require user confirmation."
      formHeader={({ growId }) => (
        <MediaEvidencePicker
          maxPhotos={10}
          allowVideo
          maxVideoSeconds={30}
          purpose="other"
          sourceContext={{ growId: growId || undefined }}
          value={evidenceAssets}
          onChange={setEvidenceAssets}
        />
      )}
      aiPrefill={{
        buttonLabel: "Suggest crop identity from grow and media",
        clearUnfilled: true,
        evidenceAssetIds: () => providerEvidencePayload(evidenceAssets).evidenceAssetIds,
        buildMessage: () =>
          `Review the selected private grow/plant context and attached photos/video to suggest a crop identity. This may be cannabis. Return JSON only with exactly these keys: {"userEnteredName":"string","scientificName":"string","cultivar":"string","userConfirmed":"false","commonNames":"string","identificationNotes":"string"}. Never identify a cultivar/strain from appearance alone. Use "not confirmed" where species-level evidence is insufficient and leave scientificName blank when uncertain. userConfirmed must always be "false" because only the user can confirm. In identificationNotes state visible traits, competing candidates, confidence limitations, and the exact whole-plant/leaf/flower/fruit/stem media needed for a better identification. Do not suggest public posting or external reporting.`
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
          key: "userConfirmed",
          label: "User confirmed species? true/false",
          defaultValue: "false"
        },
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
        userConfirmed: String(values.userConfirmed).toLowerCase() === "true",
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
          key: "confirm",
          label: "Needs confirm",
          value: outputs.userConfirmationRequired ? "Yes" : "No"
        }
      ]}
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
      buildActions={({ outputs, payload, toolRun, growId, plantContext }) => [
        {
          key: "create-crop-identity-tasks",
          label: "Create Crop Identity Tasks",
          variant: "secondary",
          pendingLabel: "Creating...",
          disabled: !growId,
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
      ]}
    />
  );
}
