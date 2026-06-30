import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { createToolRun } from "@/api/toolRuns";
import BackButton from "@/components/nav/BackButton";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import ToolResultSurface, {
  type ToolResultAction
} from "@/features/personal/tools/ToolResultSurface";
import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function toNum(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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
  const [savedRunId, setSavedRunId] = useState("");
  const [feedback, setFeedback] = useState("");

  const model = useMemo(() => {
    const liters = Math.max(0, toNum(potLiters, 0));
    const runoff = Math.max(0, toNum(runoffPct, 0));
    const interval = Math.max(1, Math.round(toNum(intervalDays, 1)));
    const base = liters * 0.22;
    const target = base * (1 + runoff / 100);
    return {
      targetLiters: target.toFixed(2),
      perWeekLiters: (target * (7 / interval)).toFixed(2),
      nextWaterDate: nextDate(interval)
    };
  }, [potLiters, runoffPct, intervalDays]);

  const input = {
    potLiters: Number(potLiters),
    runoffPct: Number(runoffPct),
    intervalDays: Number(intervalDays)
  };
  const actions: ToolResultAction[] = [
    {
      key: "save-run",
      label: savedRunId ? "Run Saved" : "Save Tool Run",
      pendingLabel: "Saving...",
      disabled: Boolean(savedRunId),
      onPress: async () => {
        setFeedback("");
        const created = await createToolRun({
          toolType: "watering",
          growId: growId || undefined,
          ...plantContext.toolRunContext,
          input,
          output: model
        });
        const id = String(created?._id || created?.id || "");
        if (!id) throw new Error("Unable to save tool run.");
        setSavedRunId(id);
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
          await apiRequest("/api/personal/tasks", {
            method: "POST",
            body: {
              growId,
              plantId: plantContext.toolRunContext.plantId,
              title: "Water plants",
              description: `Target ${model.targetLiters} L with ${runoffPct}% runoff`,
              dueDate: model.nextWaterDate
            }
          });
          setFeedback("Created grow task.");
        }
      }
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>Watering Planner</Text>
      <Text style={styles.subtitle}>Estimate watering volume and schedule.</Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
      <ToolPlantContextPicker
        plants={plantContext.plants}
        plantId={plantContext.plantId}
        selectedPlant={plantContext.selectedPlant}
        onSelect={plantContext.setPlantId}
      />

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
          }
        ]}
        assumptions={[
          "The estimate uses pot volume, runoff target, and a fixed base-volume heuristic.",
          "Plant size, medium water retention, dryback, climate, and recent watering history are not yet modeled.",
          "Inspect root-zone moisture and plant condition before watering."
        ]}
        actions={actions}
        feedback={feedback}
        contextMessage={
          !growId ? "Select a grow to enable journal and task actions." : undefined
        }
      />
    </ScrollView>
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
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF"
  }
});
