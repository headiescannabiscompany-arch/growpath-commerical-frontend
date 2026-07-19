import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { listPersonalGrows, type PersonalGrow } from "@/api/grows";
import { compareSavedGrows } from "@/api/toolRuns";
import { createPersonalTask } from "@/api/tasks";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { coerceParam } from "@/features/grows/routeUtils";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import { radius } from "@/theme/theme";

function growIdOf(grow: PersonalGrow) {
  return String(grow.id || (grow as any)._id || (grow as any).growId || "");
}

export default function GrowCompareScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const [grows, setGrows] = useState<PersonalGrow[]>([]);
  const [selected, setSelected] = useState<string[]>(growId ? [growId] : []);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [taskFeedback, setTaskFeedback] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      listPersonalGrows()
        .then((rows) => active && setGrows(rows))
        .catch(() => active && setError("Unable to load saved grows."))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, [])
  );

  function toggle(id: string) {
    if (!id || id === growId) return;
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id].slice(0, 5)
    );
  }

  async function runComparison() {
    if (selected.length < 2 || running) return;
    setRunning(true);
    setError("");
    try {
      const response = await compareSavedGrows(selected);
      setResult(response.outputs);
    } catch (reason: any) {
      setError(reason?.message || "Unable to compare saved grows.");
    } finally {
      setRunning(false);
    }
  }

  async function createNextRunTasks() {
    if (!result) return;
    setTaskFeedback("");
    const tasks = Array.isArray(result.nextRunTasks) ? result.nextRunTasks : [];
    for (const task of tasks.slice(0, 8)) {
      const due = new Date();
      due.setDate(due.getDate() + Number(task.dueInDays || 1));
      await createPersonalTask({
        growId,
        linkedGrowId: growId,
        title: String(task.title || "Run comparison follow-up"),
        description: String(
          task.description || "Apply the saved run comparison to next-run planning."
        ),
        priority: task.priority || "medium",
        dueDate: due.toISOString(),
        allDay: true,
        calendarType: "run_comparison_followup",
        sourceStage: "next_run_review"
      });
    }
    setTaskFeedback(`Created ${tasks.slice(0, 8).length} next-run task(s).`);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Run Comparison</Text>
      <Text style={styles.subtitle}>
        Select two to five saved grows. GrowPath compares their histories and clearly
        marks missing evidence and limited confidence.
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_compare"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="compare" />

      <View style={styles.card}>
        <Text style={styles.heading}>Saved grows</Text>
        {loading ? (
          <ActivityIndicator />
        ) : (
          grows.map((grow) => {
            const id = growIdOf(grow);
            const active = selected.includes(id);
            return (
              <Pressable
                key={id}
                onPress={() => toggle(id)}
                style={[styles.row, active && styles.rowOn]}
              >
                <Text style={[styles.rowText, active && styles.rowTextOn]}>
                  {grow.name || id}
                </Text>
                <Text style={[styles.meta, active && styles.rowTextOn]}>
                  {grow.cultivar || (grow as any).strain || "Cultivar not recorded"}
                </Text>
              </Pressable>
            );
          })
        )}
        <Pressable
          disabled={selected.length < 2 || running}
          onPress={runComparison}
          style={[styles.button, (selected.length < 2 || running) && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {running ? "Comparing histories..." : `Compare ${selected.length} grows`}
          </Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      {result ? (
        <ToolResultSurface
          title="Saved grow comparison"
          status="completed"
          summary={result.providerLabel || "Saved grow history comparison"}
          metrics={[
            {
              key: "grows",
              label: "Grows",
              value: result.snapshots?.length || selected.length
            },
            {
              key: "differences",
              label: "Key differences",
              value: result.keyDifferences?.length || 0
            },
            {
              key: "missing",
              label: "Missing data",
              value: result.missingData?.length || 0
            },
            { key: "confidence", label: "Confidence", value: result.confidence || "low" }
          ]}
          outputs={result}
          notices={(result.limitations || []).map((message: string, index: number) => ({
            key: `limitation-${index}`,
            severity: "medium",
            message
          }))}
          recommendations={result.recommendations || []}
          confidence={result.confidence || "low"}
          actions={[
            {
              key: "next-run-tasks",
              label: "Create Next-Run Tasks",
              variant: "secondary",
              onPress: createNextRunTasks,
              successMessage: "Next-run tasks created."
            }
          ]}
          feedback={taskFeedback}
          copyPayload={result}
        />
      ) : null}
      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grows_growid_compare"
        longContent
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", marginTop: 6, lineHeight: 20 },
  card: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 12,
    backgroundColor: "#F8FAFC"
  },
  heading: { fontWeight: "800", color: "#0F172A", marginBottom: 8 },
  row: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10,
    marginTop: 7,
    backgroundColor: "#FFFFFF"
  },
  rowOn: { backgroundColor: "#166534", borderColor: "#166534" },
  rowText: { fontWeight: "800", color: "#0F172A" },
  rowTextOn: { color: "#FFFFFF" },
  meta: { color: "#64748B", fontSize: 12, marginTop: 3 },
  button: {
    marginTop: 12,
    borderRadius: radius.card,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#16A34A"
  },
  disabled: { opacity: 0.45 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  error: { color: "#B91C1C", marginTop: 8 }
});
