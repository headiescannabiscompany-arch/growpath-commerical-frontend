import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  createTaskFromToolRun,
  getToolRun,
  listToolRuns,
  saveToolRunToLog,
  type ToolRun
} from "@/api/toolRuns";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam } from "@/features/grows/routeUtils";
import ToolResultSurface, {
  type ToolResultAction,
  type ToolResultMetric,
  type ToolResultNotice
} from "@/features/personal/tools/ToolResultSurface";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#64748B", marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    padding: 12,
    marginTop: 10
  },
  cardTitle: { fontWeight: "700" },
  cardText: { color: "#475569", marginTop: 4 },
  action: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 10
  },
  actionText: { fontWeight: "700", color: "#0F172A" },
  inlineAction: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 10
  },
  recentTitle: { marginTop: 12, fontWeight: "700", color: "#0F172A" },
  recentRow: { marginTop: 6, fontSize: 12, color: "#475569" },
  recentContext: { marginTop: 2, fontSize: 12, color: "#166534", fontWeight: "700" }
});

function withGrow(path: string, growId: string) {
  return `${path}?growId=${encodeURIComponent(growId)}`;
}

function toolRunContextLabel(run: any) {
  const context = run?.selectedPlantContext || run?.cropIdentity || {};
  const parts = [
    context?.name || (run?.plantId ? `Plant ${run.plantId}` : ""),
    context?.cropCommonName || context?.scientificName || "",
    context?.cultivarOrStrain || ""
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : "Whole grow";
}

function labelize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

function formatValue(value: any) {
  if (value == null || value === "") return "-";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return "{...}";
  return String(value);
}

function toolRunMetrics(run: ToolRun | null): ToolResultMetric[] {
  const outputs = run?.outputs || run?.result || {};
  const entries = Object.entries(outputs)
    .filter(([, value]) => value != null && typeof value !== "object")
    .slice(0, 4);
  return entries.length
    ? entries.map(([key, value]) => ({
        key,
        label: labelize(key),
        value: formatValue(value)
      }))
    : [{ key: "status", label: "Status", value: run?.status || "completed" }];
}

function toolRunNotices(run: ToolRun | null): ToolResultNotice[] {
  return (run?.warnings || []).map((message, index) => ({
    key: `warning-${index}`,
    severity: "medium",
    message
  }));
}

export default function GrowToolsScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const [recent, setRecent] = useState<ToolRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ToolRun | null>(null);
  const [loadingRunId, setLoadingRunId] = useState("");
  const [feedback, setFeedback] = useState("");

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const rows = await listToolRuns({ growId });
        if (!mounted) return;
        setRecent(Array.isArray(rows) ? rows.slice(0, 4) : []);
      })();
      return () => {
        mounted = false;
      };
    }, [growId])
  );

  const selectedRunId = String(selectedRun?._id || selectedRun?.id || "");
  const selectedActions: ToolResultAction[] = selectedRunId
    ? [
        {
          key: "save-log",
          label: "Save to Grow Log",
          pendingLabel: "Saving...",
          successMessage: "Saved to grow log.",
          onPress: async () => {
            await saveToolRunToLog(selectedRunId);
          }
        },
        {
          key: "create-task",
          label: "Create Task",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Task created.",
          onPress: async () => {
            await createTaskFromToolRun(selectedRunId);
          }
        }
      ]
    : [];

  async function viewRun(run: ToolRun) {
    const id = String(run?._id || run?.id || "");
    if (!id) return;
    setLoadingRunId(id);
    setFeedback("");
    const fullRun = await getToolRun(id);
    setSelectedRun(fullRun || run);
    setFeedback(fullRun ? "" : "Unable to reload this run; showing cached list data.");
    setLoadingRunId("");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Grow Tools</Text>
      <Text style={styles.subtitle}>
        Run tools in this grow context and save outputs.
      </Text>
      <GrowWorkspaceNav growId={growId} active="tools" />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Open full tools hub</Text>
        <Text style={styles.cardText}>
          All tool groups are available with this grow pre-selected.
        </Text>
        <Link href={withGrow("/home/personal/tools", growId)} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Open tools hub</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick tools</Text>
        <Text style={styles.cardText}>Jump directly to common workflows.</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <Link href={withGrow("/home/personal/tools/vpd", growId)} asChild>
            <Pressable style={styles.action}>
              <Text style={styles.actionText}>VPD</Text>
            </Pressable>
          </Link>
          <Link href={withGrow("/home/personal/tools/watering", growId)} asChild>
            <Pressable style={styles.action}>
              <Text style={styles.actionText}>Watering</Text>
            </Pressable>
          </Link>
          <Link href={withGrow("/home/personal/tools/npk", growId)} asChild>
            <Pressable style={styles.action}>
              <Text style={styles.actionText}>NPK Preview</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={styles.recentTitle}>Recent tool runs</Text>
        {recent.length === 0 ? (
          <Text style={styles.recentRow}>No saved runs yet.</Text>
        ) : (
          recent.map((run, index) => (
            <View
              key={String(run?._id || run?.id || `${run?.toolType || "tool"}-${index}`)}
            >
              <Text style={styles.recentRow}>
                {run?.toolType || run?.toolName || "tool"} |{" "}
                {String(run?.createdAt || "").slice(0, 10)}
              </Text>
              <Text style={styles.recentContext}>{toolRunContextLabel(run)}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => viewRun(run)}
                style={styles.inlineAction}
              >
                <Text style={styles.actionText}>
                  {loadingRunId === String(run?._id || run?.id || "")
                    ? "Loading..."
                    : "View result"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {selectedRun ? (
        <ToolResultSurface
          title={`${selectedRun.toolType || selectedRun.toolName || "Tool"} result`}
          status={selectedRun.status || "completed"}
          summary={selectedRun.summary || toolRunContextLabel(selectedRun)}
          metrics={toolRunMetrics(selectedRun)}
          inputs={selectedRun.inputs || selectedRun.input || selectedRun.params || {}}
          outputs={selectedRun.outputs || selectedRun.output || selectedRun.result || {}}
          notices={toolRunNotices(selectedRun)}
          recommendations={selectedRun.recommendations || []}
          formulas={selectedRun.formulas || []}
          uncertainty={selectedRun.uncertainty || null}
          confidence={selectedRun.confidence || null}
          actions={selectedActions}
          feedback={feedback}
          copyPayload={selectedRun}
        />
      ) : null}
    </ScrollView>
  );
}
