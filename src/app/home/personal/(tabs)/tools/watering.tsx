import React, { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import BackButton from "@/components/nav/BackButton";
import { apiRequest } from "@/api/apiRequest";
import { createToolRun } from "@/api/toolRuns";
import { saveToolRunAndOpenJournal } from "@/features/personal/tools/saveToolRunAndOpenJournal";

function toNum(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nextDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

export default function WateringToolScreen() {
  const router = useRouter();
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(rawGrowId);

  const [potLiters, setPotLiters] = useState("11");
  const [runoffPct, setRunoffPct] = useState("10");
  const [intervalDays, setIntervalDays] = useState("2");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [savingAndOpening, setSavingAndOpening] = useState(false);

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

  return (
    <View style={styles.container}>
      <BackButton />
      <Text style={styles.title}>Watering Planner</Text>
      <Text style={styles.subtitle}>Estimate watering volume and schedule.</Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

      <Text style={styles.label}>Pot size (L)</Text>
      <TextInput
        style={styles.input}
        value={potLiters}
        onChangeText={setPotLiters}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Runoff target (%)</Text>
      <TextInput
        style={styles.input}
        value={runoffPct}
        onChangeText={setRunoffPct}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Water every (days)</Text>
      <TextInput
        style={styles.input}
        value={intervalDays}
        onChangeText={setIntervalDays}
        keyboardType="numeric"
      />

      <View style={styles.card}>
        <Text style={styles.result}>Target volume: {model.targetLiters} L per watering</Text>
        <Text style={styles.line}>Estimated weekly total: {model.perWeekLiters} L</Text>
        <Text style={styles.line}>Next watering date: {model.nextWaterDate}</Text>
      </View>

      <View style={styles.row}>
        <Pressable
          style={styles.saveButton}
          onPress={async () => {
            const created = await createToolRun({
              toolType: "watering",
              growId: growId || undefined,
              input: {
                potLiters: Number(potLiters),
                runoffPct: Number(runoffPct),
                intervalDays: Number(intervalDays)
              },
              output: model
            });
            if (created) {
              setSaveFeedback("Saved tool run.");
            } else {
              setSaveFeedback("Unable to save tool run.");
            }
          }}
        >
          <Text style={styles.saveButtonText}>Save run {growId ? "to grow" : ""}</Text>
        </Pressable>

        {growId ? (
          <Pressable
            style={[styles.secondaryButton, savingAndOpening ? { opacity: 0.7 } : null]}
            disabled={savingAndOpening}
            onPress={async () => {
              if (savingAndOpening) return;
              setSavingAndOpening(true);
              const result = await saveToolRunAndOpenJournal({
                router,
                growId,
                toolKey: "watering",
                input: {
                  potLiters: Number(potLiters),
                  runoffPct: Number(runoffPct),
                  intervalDays: Number(intervalDays)
                },
                output: model
              });
              if (!result.ok) setSaveFeedback(result.error);
              setSavingAndOpening(false);
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {savingAndOpening ? "Saving..." : "Save and Open Journal"}
            </Text>
          </Pressable>
        ) : null}

        {growId ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={async () => {
              try {
                await apiRequest("/api/personal/tasks", {
                  method: "POST",
                  body: {
                    growId,
                    title: "Water plants",
                    description: `Target ${model.targetLiters} L with ${runoffPct}% runoff`,
                    dueDate: model.nextWaterDate
                  }
                });
                setSaveFeedback("Created grow task.");
              } catch {
                setSaveFeedback("Unable to create task.");
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>Create task</Text>
          </Pressable>
        ) : null}
      </View>

      {saveFeedback ? <Text style={styles.hint}>{saveFeedback}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FFFFFF", gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 6 },
  context: { color: "#166534", fontWeight: "700", marginBottom: 4 },
  label: { fontWeight: "700", marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#FFFFFF"
  },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F8FAFC",
    marginTop: 10,
    gap: 4
  },
  result: { fontSize: 18, fontWeight: "800" },
  line: { color: "#334155" },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#166534",
    backgroundColor: "#166534"
  },
  saveButtonText: { color: "#FFFFFF", fontWeight: "700" },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF"
  },
  secondaryButtonText: { color: "#0F172A", fontWeight: "700" },
  hint: { marginTop: 6, fontSize: 12, color: "#64748B" }
});
