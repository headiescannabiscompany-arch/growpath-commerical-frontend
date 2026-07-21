import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  archiveToolRun,
  createTaskFromToolRun,
  getToolRun,
  listToolRuns,
  saveToolRunToLog,
  updateToolRun,
  type ToolRun
} from "@/api/toolRuns";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import ToolResultSurface, {
  type ToolResultAction,
  type ToolResultMetric,
  type ToolResultNotice
} from "@/features/personal/tools/ToolResultSurface";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";

const TOOL_FILTERS = [
  { label: "All", value: "" },
  { label: "IPM", value: "ipm_scout" },
  { label: "Harvest", value: "harvest_readiness" },
  { label: "Pheno", value: "pheno_hunt" },
  { label: "Steering", value: "crop_steering_project" },
  { label: "NPK", value: "npk_recipe" },
  { label: "Dry/Cure", value: "dry_cure_guard" }
];

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function idFor(run: ToolRun) {
  return String(run?._id || run?.id || "");
}

function formatDate(value?: string) {
  return value ? String(value).slice(0, 10) : "unsaved";
}

function labelize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

function formatValue(value: unknown) {
  if (value == null || value === "") return "-";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return "{...}";
  return String(value);
}

function metricsFor(run: ToolRun | null): ToolResultMetric[] {
  const outputs = run?.outputs || run?.result || {};
  const entries = Object.entries(outputs)
    .filter(([, value]) => value != null && typeof value !== "object")
    .slice(0, 6);
  return entries.length
    ? entries.map(([key, value]) => ({
        key,
        label: labelize(key),
        value: formatValue(value)
      }))
    : [{ key: "status", label: "Status", value: run?.status || "completed" }];
}

function noticesFor(run: ToolRun | null): ToolResultNotice[] {
  return (run?.warnings || []).map((message, index) => ({
    key: `warning-${index}`,
    severity: "medium",
    message
  }));
}

function runTitle(run: ToolRun | null) {
  const type = run?.toolType || run?.toolName || "tool";
  return labelize(type);
}

export default function SavedToolRunsScreen() {
  const params = useLocalSearchParams<{
    growId?: string | string[];
    runId?: string | string[];
    toolType?: string | string[];
    toolRunId?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(params.growId), [params.growId]);
  const initialToolType = useMemo(() => coerceParam(params.toolType), [params.toolType]);
  const targetToolRunId = useMemo(
    () => coerceParam(params.toolRunId) || coerceParam(params.runId),
    [params.runId, params.toolRunId]
  );
  const [toolType, setToolType] = useState(initialToolType);
  const [runs, setRuns] = useState<ToolRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ToolRun | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const pendingFocusRunIdRef = useRef("");

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    const rows = await listToolRuns({
      growId: growId || undefined,
      toolType: toolType || undefined
    });
    setRuns(rows);
    setLoading(false);
  }, [growId, toolType]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const selectRun = useCallback(async (run: ToolRun) => {
    const id = idFor(run);
    if (!id) return;
    pendingFocusRunIdRef.current = id;
    setFeedback("");
    const full = await getToolRun(id);
    const nextRun = full || run;
    setSelectedRun(nextRun);
    setSummaryDraft(nextRun.summary || "");
    if (!full) setFeedback("Unable to reload this run; showing cached list data.");
  }, []);

  useEffect(() => {
    if (!targetToolRunId || loading) return;
    if (selectedRun && idFor(selectedRun) === targetToolRunId) return;
    const matchingRun = runs.find((run) => idFor(run) === targetToolRunId);
    if (matchingRun) {
      void selectRun(matchingRun);
      return;
    }
    void (async () => {
      pendingFocusRunIdRef.current = targetToolRunId;
      setFeedback("");
      const full = await getToolRun(targetToolRunId);
      if (!full) {
        setFeedback("Unable to find the requested saved run.");
        return;
      }
      setSelectedRun(full);
      setSummaryDraft(full.summary || "");
    })();
  }, [loading, runs, selectedRun, selectRun, targetToolRunId]);

  async function saveSummary() {
    const id = selectedRun ? idFor(selectedRun) : "";
    if (!id) return;
    const updated = await updateToolRun(id, { summary: summaryDraft });
    if (!updated) {
      setFeedback("Unable to update this saved run.");
      return;
    }
    setSelectedRun(updated);
    setSummaryDraft(updated.summary || "");
    setFeedback("Saved run updated.");
    await load();
  }

  async function archiveSelectedRun() {
    const id = selectedRun ? idFor(selectedRun) : "";
    if (!id) return;
    const ok = await archiveToolRun(id);
    if (!ok) {
      setFeedback("Unable to archive this saved run.");
      return;
    }
    setSelectedRun(null);
    setSummaryDraft("");
    setFeedback("Saved run archived.");
    await load();
  }

  const selectedRunId = selectedRun ? idFor(selectedRun) : "";
  const actions: ToolResultAction[] = selectedRunId
    ? [
        {
          key: "save-log",
          label: "Save to Grow Log",
          variant: "secondary",
          pendingLabel: "Saving...",
          successMessage: "Saved to grow log.",
          onPress: () => saveToolRunToLog(selectedRunId)
        },
        {
          key: "create-task",
          label: "Create Task",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Task created.",
          onPress: () => createTaskFromToolRun(selectedRunId)
        },
        {
          key: "archive",
          label: "Archive Run",
          variant: "secondary",
          pendingLabel: "Archiving...",
          successMessage: "Archived.",
          onPress: archiveSelectedRun
        }
      ]
    : [];

  return (
    <ScreenBoundary
      title="Saved Tool Runs"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Saved Tool Runs
          </Text>
          <Text style={styles.subtitle}>
            Reopen, annotate, archive, and continue from saved GrowPath results.
          </Text>
          <PersonalFeedPlacement
            placement="top"
            routeKey="personal_tools_saved_runs"
            longContent
          />
          {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
        </View>

        <View style={styles.filters}>
          {TOOL_FILTERS.map((filter) => {
            const active = toolType === filter.value;
            return (
              <Pressable
                key={filter.value || "all"}
                accessibilityRole="button"
                onPress={() => setToolType(filter.value)}
                style={[styles.chip, active && styles.chipOn]}
              >
                <Text style={[styles.chipText, active && styles.chipTextOn]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {selectedRun ? (
          <View
            style={styles.selectedResult}
            onLayout={(event) => {
              if (pendingFocusRunIdRef.current !== selectedRunId) return;
              pendingFocusRunIdRef.current = "";
              scrollRef.current?.scrollTo({
                y: Math.max(0, event.nativeEvent.layout.y - 12),
                animated: false
              });
            }}
          >
            <Text
              style={styles.selectedLabel}
              accessibilityLabel={`Opened exact saved tool result ${selectedRunId}`}
            >
              {targetToolRunId === selectedRunId
                ? "Opened from source link"
                : "Selected result"}
            </Text>
            <ToolResultSurface
              title={`${runTitle(selectedRun)} result`}
              status={selectedRun.status || "completed"}
              summary={selectedRun.summary || ""}
              metrics={metricsFor(selectedRun)}
              inputs={selectedRun.inputs || selectedRun.input || selectedRun.params || {}}
              outputs={
                selectedRun.outputs || selectedRun.output || selectedRun.result || {}
              }
              notices={noticesFor(selectedRun)}
              recommendations={selectedRun.recommendations || []}
              formulas={selectedRun.formulas || []}
              uncertainty={selectedRun.uncertainty || null}
              confidence={selectedRun.confidence || null}
              actions={actions}
              feedback={feedback}
              copyPayload={selectedRun}
            />
            <View style={styles.editor}>
              <Text style={styles.label}>Summary / note</Text>
              <TextInput
                value={summaryDraft}
                onChangeText={setSummaryDraft}
                multiline
                style={styles.input}
                placeholder="Add a short note for this saved run"
              />
              <Pressable
                accessibilityRole="button"
                onPress={saveSummary}
                style={styles.primary}
              >
                <Text style={styles.primaryText}>Save Note</Text>
              </Pressable>
            </View>
          </View>
        ) : feedback ? (
          <Text style={styles.feedback}>{feedback}</Text>
        ) : null}

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_tools_saved_runs"
          longContent
        />

        <Text style={styles.sectionTitle}>Saved run history</Text>

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator />
          </View>
        ) : runs.length ? (
          <View style={styles.list}>
            {runs.map((run) => {
              const active = selectedRunId && selectedRunId === idFor(run);
              return (
                <Pressable
                  key={idFor(run)}
                  accessibilityLabel={
                    active
                      ? `Selected saved tool run ${idFor(run)}`
                      : `Saved tool run ${idFor(run)}`
                  }
                  accessibilityRole="button"
                  onPress={() => selectRun(run)}
                  style={[styles.card, active && styles.cardOn]}
                >
                  <Text style={styles.cardTitle}>{runTitle(run)}</Text>
                  <Text style={styles.meta}>
                    {formatDate(run.createdAt)} | {run.growId || "No grow"}
                  </Text>
                  <Text style={styles.cardText} numberOfLines={2}>
                    {run.summary ||
                      JSON.stringify(run.outputs || run.result || {}).slice(0, 180)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No saved runs</Text>
            <Text style={styles.cardText}>
              Run a tool and it will appear here as a saved ToolRun record.
            </Text>
          </View>
        )}

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_saved_runs"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 48, gap: 14 },
  header: { gap: 6 },
  title: { color: "#0F172A", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#475569", lineHeight: 20 },
  context: { color: "#166534", fontWeight: "800" },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectedResult: {
    gap: 12,
    borderWidth: 2,
    borderColor: "#166534",
    borderRadius: radius.card,
    backgroundColor: "#F0FDF4",
    padding: 12
  },
  selectedLabel: { color: "#166534", fontSize: 12, fontWeight: "800" },
  sectionTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  chip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF"
  },
  chipOn: { borderColor: "#166534", backgroundColor: "#166534" },
  chipText: { color: "#0F172A", fontSize: 12, fontWeight: "800" },
  chipTextOn: { color: "#FFFFFF" },
  list: { gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC",
    padding: 12,
    gap: 5
  },
  cardOn: { borderColor: "#166534", backgroundColor: "#F0FDF4" },
  cardTitle: { color: "#0F172A", fontWeight: "800" },
  cardText: { color: "#475569", lineHeight: 19 },
  meta: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  editor: { gap: 8 },
  label: { color: "#334155", fontSize: 12, fontWeight: "800" },
  input: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    padding: 10,
    textAlignVertical: "top"
  },
  primary: {
    alignSelf: "flex-start",
    borderRadius: radius.card,
    backgroundColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800" },
  feedback: { color: "#334155", fontWeight: "700" }
});
