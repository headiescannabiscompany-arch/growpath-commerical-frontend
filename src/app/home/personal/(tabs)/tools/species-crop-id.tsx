import React from "react";

import BackendCalculatorToolScreen, {
  tomorrow
} from "@/features/personal/tools/BackendCalculatorToolScreen";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";

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
  return (
    <BackendCalculatorToolScreen
      tool="species-crop-id"
      toolKey="species-crop-id"
      title="Species / Crop Identification"
      subtitle="Confirm crop identity for diagnosis, nutrient, environment, and IPM context without enabling invasive-species reporting."
      fields={[
        { key: "userEnteredName", label: "Plant or crop name", defaultValue: "Cannabis" },
        {
          key: "scientificName",
          label: "Scientific name, if known",
          defaultValue: "Cannabis sativa"
        },
        { key: "cultivar", label: "Cultivar / strain", defaultValue: "" },
        {
          key: "userConfirmed",
          label: "User confirmed species? true/false",
          defaultValue: "true"
        },
        {
          key: "commonNames",
          label: "Common names, comma-separated",
          defaultValue: "cannabis, hemp"
        }
      ]}
      buildPayload={(values, { growId, plantContext }) => ({
        growId,
        ...plantContext.toolRunContext,
        userEnteredName: values.userEnteredName,
        scientificName: values.scientificName,
        cultivar: values.cultivar,
        userConfirmed: String(values.userConfirmed).toLowerCase() === "true",
        commonNames: values.commonNames
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
