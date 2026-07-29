import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import ToolResultSurface, {
  type ToolResultAction
} from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateTask,
  saveToolRunAndOpenJournal,
  saveToolRunResult
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { buildWateringEstimate } from "@/features/personal/tools/wateringEstimate";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";
import { askPersonalAssistant } from "@/api/personalAssistant";

function toNum(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNum(value: string) {
  if (!value.trim()) return NaN;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function nextDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function wateringTaskMetadata() {
  return {
    allDay: true,
    calendarType: "watering_followup",
    sourceStage: "watering_application",
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
}

export default function WateringToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = coerceParam(rawGrowId);
  const plantContext = useToolPlantContext(growId, coerceParam(rawPlantId));

  const [potLiters, setPotLiters] = useState("11");
  const [runoffPct, setRunoffPct] = useState("10");
  const [intervalDays, setIntervalDays] = useState("2");
  const [medium, setMedium] = useState("soil");
  const [stage, setStage] = useState("veg");
  const [targetDrybackPercent, setTargetDrybackPercent] = useState("20");
  const [actualDrybackPercent, setActualDrybackPercent] = useState("");
  const [vpdKpa, setVpdKpa] = useState("");
  const [recentRunoffPct, setRecentRunoffPct] = useState("");
  const [recoveryTimeHours, setRecoveryTimeHours] = useState("");
  const [leafResponse, setLeafResponse] = useState("");
  const [savedRunId, setSavedRunId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [prefilling, setPrefilling] = useState(false);

  async function prefillFromGrow() {
    if (!growId || prefilling) return;
    setPrefilling(true);
    setFeedback("");
    try {
      const response = await askPersonalAssistant({
        growId,
        plantId: plantContext.plantId || undefined,
        context: {
          workflow: "watering",
          requestedFields: [
            "potLiters",
            "runoffPct",
            "intervalDays",
            "medium",
            "stage",
            "targetDrybackPercent",
            "actualDrybackPercent",
            "vpdKpa",
            "recentRunoffPct",
            "recoveryTimeHours",
            "leafResponse"
          ]
        },
        message: `Prefill this Watering Plan from the selected grow/plant's actual soil or media recipe, container volume, water profile, irrigation events, pot-weight or moisture dryback, runoff, pH/EC, VPD/environment, stage, root-zone notes, and plant recovery. Return JSON only with exactly these string keys: potLiters, runoffPct, intervalDays, medium, stage, targetDrybackPercent, actualDrybackPercent, vpdKpa, recentRunoffPct, recoveryTimeHours, leafResponse. Numeric values must come from saved measurements or explicit records. Do not treat a calendar interval as proof the plant needs water. Distinguish peat/perlite, coco, hydro, and living-soil water-holding, aeration, buffering, and runoff practices; a 50/50 peat-perlite mix must not receive the same assumptions as a 1:1:1 Coots-style mix. Leave unknowns blank. Put evidence, uncertainty, and the next physical root-zone check in leafResponse.`
      });
      const raw = String(response.reply || "");
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const parsed = JSON.parse(fenced?.[1] || raw.slice(raw.indexOf("{")));
      setPotLiters(String(parsed.potLiters ?? ""));
      setRunoffPct(String(parsed.runoffPct ?? ""));
      setIntervalDays(String(parsed.intervalDays ?? ""));
      setMedium(String(parsed.medium ?? ""));
      setStage(String(parsed.stage ?? ""));
      setTargetDrybackPercent(String(parsed.targetDrybackPercent ?? ""));
      setActualDrybackPercent(String(parsed.actualDrybackPercent ?? ""));
      setVpdKpa(String(parsed.vpdKpa ?? ""));
      setRecentRunoffPct(String(parsed.recentRunoffPct ?? ""));
      setRecoveryTimeHours(String(parsed.recoveryTimeHours ?? ""));
      setLeafResponse(String(parsed.leafResponse ?? ""));
      setSavedRunId("");
      setFeedback(
        `AI filled the watering plan from grow records. Review every value before creating a task.${response.missingInformation?.length ? ` Optional missing details: ${response.missingInformation.join(", ")}.` : ""}`
      );
    } catch (error: any) {
      setFeedback(error?.message || "AI could not prefill the watering plan.");
    } finally {
      setPrefilling(false);
    }
  }

  const model = useMemo(() => {
    const estimate = buildWateringEstimate({
      potLiters: toNum(potLiters, 0),
      runoffPct: toNum(runoffPct, 0),
      intervalDays: toNum(intervalDays, 1),
      plantGrowthProfile: plantContext.selectedPlantContext?.growthProfile,
      medium,
      stage,
      targetDrybackPercent: toNum(targetDrybackPercent, NaN),
      actualDrybackPercent: toOptionalNum(actualDrybackPercent),
      vpdKpa: toOptionalNum(vpdKpa),
      recentRunoffPct: toOptionalNum(recentRunoffPct),
      recoveryTimeHours: toOptionalNum(recoveryTimeHours),
      leafResponse
    });
    return {
      ...estimate,
      nextWaterDate: nextDate(toNum(intervalDays, 1))
    };
  }, [
    actualDrybackPercent,
    intervalDays,
    leafResponse,
    medium,
    plantContext.selectedPlantContext,
    potLiters,
    recentRunoffPct,
    recoveryTimeHours,
    runoffPct,
    stage,
    targetDrybackPercent,
    vpdKpa
  ]);

  const input = {
    potLiters: Number(potLiters),
    runoffPct: Number(runoffPct),
    intervalDays: Number(intervalDays),
    medium,
    stage,
    targetDrybackPercent: Number(targetDrybackPercent),
    actualDrybackPercent: toOptionalNum(actualDrybackPercent),
    vpdKpa: toOptionalNum(vpdKpa),
    recentRunoffPct: toOptionalNum(recentRunoffPct),
    recoveryTimeHours: toOptionalNum(recoveryTimeHours),
    leafResponse
  };
  const actions: ToolResultAction[] = [
    {
      key: "save-run",
      label: savedRunId ? "Run Saved" : "Save Tool Run",
      pendingLabel: "Saving...",
      disabled: Boolean(savedRunId),
      onPress: async () => {
        setFeedback("");
        const result = await saveToolRunResult({
          growId,
          ...plantContext.toolRunContext,
          toolKey: "watering",
          input,
          output: model
        });
        if (!result.ok) throw new Error(result.error);
        setSavedRunId(result.toolRunId);
        setFeedback("Saved tool run.");
      }
    }
  ];

  if (growId) {
    actions.push(
      {
        key: "open-journal",
        label: "Open Journal Entry",
        variant: "secondary",
        pendingLabel: "Opening...",
        onPress: async () => {
          const result = await saveToolRunAndOpenJournal({
            router,
            growId,
            ...plantContext.toolRunContext,
            toolKey: "watering",
            toolRunId: savedRunId || undefined,
            input,
            output: model
          });
          if (!result.ok) throw new Error(result.error);
        }
      },
      {
        key: "create-task",
        label: "Create Watering Task",
        variant: "secondary",
        onPress: async () => {
          const result = await saveToolRunAndCreateTask({
            growId,
            ...plantContext.toolRunContext,
            toolKey: "watering",
            toolRunId: savedRunId || undefined,
            input,
            output: model,
            title: "Water plants",
            description: `Target ${model.targetLiters} L with ${runoffPct}% runoff. Pressure: ${model.pressureLevel}.`,
            priority: "medium",
            dueDate: model.nextWaterDate,
            ...wateringTaskMetadata()
          });
          if (!result.ok) throw new Error(result.error);
          if (!savedRunId) setSavedRunId(result.toolRunId);
          setFeedback("Created grow task.");
        }
      }
    );
  }

  return (
    <ScreenBoundary
      title="Watering Planner"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Watering Planner</Text>
        <Text style={styles.subtitle}>Estimate watering volume and schedule.</Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_watering"
          longContent
        />
        {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
        <ToolPlantContextPicker
          plants={plantContext.plants}
          plantId={plantContext.plantId}
          selectedPlant={plantContext.selectedPlant}
          onSelect={plantContext.setPlantId}
        />

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>AI grow-context prefill</Text>
          <Text style={styles.aiText}>
            Fill recorded medium, container, water, dryback, environment, and recovery
            fields. Unknown measurements are left blank.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fill watering plan from grow"
            disabled={!growId || prefilling}
            onPress={prefillFromGrow}
            style={[styles.aiButton, (!growId || prefilling) && styles.disabled]}
          >
            <Text style={styles.aiButtonText}>
              {prefilling ? "Reviewing grow..." : "Fill watering plan from grow"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Pot size (L)</Text>
        <TextInput
          accessibilityLabel="Watering pot size liters"
          style={styles.input}
          value={potLiters}
          onChangeText={(value) => {
            setPotLiters(value);
            setSavedRunId("");
          }}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Runoff target (%)</Text>
        <TextInput
          accessibilityLabel="Watering runoff target percent"
          style={styles.input}
          value={runoffPct}
          onChangeText={(value) => {
            setRunoffPct(value);
            setSavedRunId("");
          }}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Water every (days)</Text>
        <TextInput
          accessibilityLabel="Watering interval days"
          style={styles.input}
          value={intervalDays}
          onChangeText={(value) => {
            setIntervalDays(value);
            setSavedRunId("");
          }}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Medium</Text>
        <TextInput
          accessibilityLabel="Watering medium"
          style={styles.input}
          value={medium}
          onChangeText={(value) => {
            setMedium(value);
            setSavedRunId("");
          }}
        />
        <Text style={styles.label}>Stage</Text>
        <TextInput
          accessibilityLabel="Watering stage"
          style={styles.input}
          value={stage}
          onChangeText={(value) => {
            setStage(value);
            setSavedRunId("");
          }}
        />
        <Text style={styles.label}>Target dryback (%)</Text>
        <TextInput
          accessibilityLabel="Watering target dryback percent"
          style={styles.input}
          value={targetDrybackPercent}
          onChangeText={(value) => {
            setTargetDrybackPercent(value);
            setSavedRunId("");
          }}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Actual dryback (%)</Text>
        <TextInput
          accessibilityLabel="Watering actual dryback percent"
          style={styles.input}
          value={actualDrybackPercent}
          onChangeText={(value) => {
            setActualDrybackPercent(value);
            setSavedRunId("");
          }}
          keyboardType="numeric"
        />
        <Text style={styles.label}>VPD (kPa)</Text>
        <TextInput
          accessibilityLabel="Watering VPD kPa"
          style={styles.input}
          value={vpdKpa}
          onChangeText={(value) => {
            setVpdKpa(value);
            setSavedRunId("");
          }}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Recent runoff (%)</Text>
        <TextInput
          accessibilityLabel="Watering recent runoff percent"
          style={styles.input}
          value={recentRunoffPct}
          onChangeText={(value) => {
            setRecentRunoffPct(value);
            setSavedRunId("");
          }}
          keyboardType="numeric"
        />
        <Text style={styles.label}>
          Recovery time after last irrigation/dryback (hours)
        </Text>
        <TextInput
          accessibilityLabel="Watering recovery time hours"
          style={styles.input}
          value={recoveryTimeHours}
          onChangeText={(value) => {
            setRecoveryTimeHours(value);
            setSavedRunId("");
          }}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Leaf response</Text>
        <TextInput
          accessibilityLabel="Watering leaf response"
          style={styles.input}
          value={leafResponse}
          onChangeText={(value) => {
            setLeafResponse(value);
            setSavedRunId("");
          }}
          placeholder="turgid, droop, wilt, stalled, recovered"
        />

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_tools_watering"
          longContent
        />

        <ToolResultSurface
          title="Watering estimate"
          status="HEURISTIC"
          metrics={[
            {
              key: "target-volume",
              label: "Target per watering",
              value: `${model.targetLiters} L`
            },
            {
              key: "weekly-volume",
              label: "Estimated weekly total",
              value: `${model.perWeekLiters} L`
            },
            {
              key: "next-date",
              label: "Next planned date",
              value: model.nextWaterDate
            },
            {
              key: "plant-adjustment",
              label: "Plant adjustment",
              value: model.plantAdjustmentLabel,
              detail:
                model.plantContextReasons.join(" | ") || "No plant size/demand overlay"
            },
            {
              key: "watering-intent",
              label: "Watering intent",
              value: model.wateringIntent.replace(/_/g, " ")
            },
            {
              key: "pressure-level",
              label: "Pressure level",
              value: String(model.pressureLevel).toUpperCase(),
              detail:
                model.environmentalAdjustmentReasons.join(" | ") ||
                "No stage/medium/VPD adjustment"
            },
            {
              key: "dryback",
              label: "Dryback",
              value:
                model.actualDrybackPercent == null
                  ? `${model.targetDrybackPercent ?? "?"}% target`
                  : `${model.actualDrybackPercent}% actual / ${model.targetDrybackPercent ?? "?"}% target`
            }
          ]}
          assumptions={[
            "The estimate uses pot volume, runoff target, stage, medium, VPD, and plant context where available.",
            model.plantContextRequiresConfirmation
              ? "Selected plant size or water-demand context is present but did not change the estimate because the crop/profile context is not confirmed."
              : "",
            model.plantContextApplied
              ? "Selected plant canopy size and observed water demand adjusted the volume estimate."
              : "No selected plant size or observed water-demand adjustment was applied.",
            ...model.warnings,
            ...model.recommendations,
            "Inspect root-zone moisture, pot weight, and plant condition before watering."
          ].filter(Boolean)}
          actions={actions}
          feedback={feedback}
          contextMessage={
            !growId ? "Select a grow to enable journal and task actions." : undefined
          }
        />

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_watering"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 36, backgroundColor: "#FFFFFF", gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 4 },
  context: { color: "#166534", fontWeight: "700" },
  label: { fontWeight: "700", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#FFFFFF"
  },
  aiCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  aiTitle: { color: "#14532D", fontWeight: "800" },
  aiText: { color: "#475569", lineHeight: 19 },
  aiButton: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  aiButtonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.45 }
});
