import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { getFacilityComplianceExport } from "@/api/complianceExport";
import { useFacility } from "@/state/useFacility";
import { AICallBody, useAICall } from "@/hooks/useAICall";

type Preset = {
  key: string;
  title: string;
  audience: string;
  tool: string;
  fn: string;
  requiresGrow?: boolean;
  args: Record<string, unknown>;
  summary: string;
};

const PRESETS: Preset[] = [
  {
    key: "dew-point",
    title: "Dew point alert",
    audience: "Cultivation / facilities",
    tool: "environment",
    fn: "assessDewPointRisk",
    args: { airTemp: 72, rh: 82, surfaceTemp: 67, tempUnit: "F" },
    summary: "Check condensation risk from sensor or pulse monitor readings."
  },
  {
    key: "compliance",
    title: "Inspection readiness",
    audience: "Owners / compliance",
    tool: "compliance",
    fn: "buildReadinessChecklist",
    args: {
      counts: {
        pendingVerifications: 0,
        openTasks: 4,
        auditEvents: 25,
        sopRuns: 3,
        inventoryReconciliations: 1
      }
    },
    summary: "Score gaps before exporting the facility evidence packet."
  },
  {
    key: "inventory",
    title: "Inventory risk",
    audience: "Purchasing / inventory",
    tool: "inventory",
    fn: "assessStockRisk",
    args: {
      reorderWithinDays: 7,
      items: [
        { name: "pH Down", quantity: 1, par: 4, dailyUse: 0.5 },
        { name: "Gloves", quantity: 200, par: 50, dailyUse: 3 }
      ]
    },
    summary: "Flag stock risks using counts, par levels, and estimated daily use."
  },
  {
    key: "dli",
    title: "DLI planning",
    audience: "Cultivation / lighting",
    tool: "light",
    fn: "computeDLI",
    args: {
      stage: "flower",
      photoperiodHours: 12,
      targetDli: 30,
      measuredPpfd: 620
    },
    summary: "Compare measured PPFD against stage target DLI and light schedule."
  },
  {
    key: "harvest",
    title: "Harvest window",
    audience: "Cultivation",
    tool: "harvest",
    fn: "estimateHarvestWindow",
    requiresGrow: true,
    args: {
      daysSinceFlip: 65,
      goal: "balanced",
      distribution: { clear: 0.2, cloudy: 0.7, amber: 0.1 }
    },
    summary: "Estimate harvest timing from trichome distribution and flower age."
  }
];

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function complianceResultFromLast(last: any) {
  const data = last?.data;
  if (data?.tool !== "compliance" || data?.fn !== "buildReadinessChecklist") {
    return null;
  }
  const result = data?.result;
  if (!result || typeof result !== "object") return null;
  return result as {
    readinessScore?: number;
    status?: string;
    issues?: string[];
    checklist?: Array<{
      label?: string;
      done?: boolean;
      status?: string;
      count?: number;
    }>;
    evidenceSummary?: {
      sopRuns?: {
        totalRuns?: number;
        totalSteps?: number;
        doneSteps?: number;
        skippedSteps?: number;
        pendingSteps?: number;
        runsMissingSteps?: number;
      };
    };
  };
}

function readinessArgsFromCounts(
  counts: Record<string, number>,
  evidenceSummary?: { sopRuns?: Record<string, number> }
) {
  return {
    counts: {
      pendingVerifications: counts.verifications ?? 0,
      openTasks: counts.tasks ?? 0,
      auditEvents: counts.auditLogs ?? 0,
      sopRuns: counts.sopRuns ?? 0,
      inventoryReconciliations: counts.inventoryReconciliations ?? 0
    },
    exportCoverage: {
      rooms: counts.rooms ?? 0,
      equipment: counts.equipment ?? 0,
      batchCycles: counts.batchCycles ?? 0,
      plants: counts.plants ?? 0,
      growLogs: counts.growLogs ?? 0,
      inventoryItems: counts.inventoryItems ?? 0,
      complianceLogs: counts.complianceLogs ?? 0,
      deviations: counts.deviations ?? 0,
      sopTemplates: counts.sopTemplates ?? 0,
      metrcCredentialStatus: counts.metrcCredentialStatus ?? 0,
      metrcPlants: counts.metrcPlants ?? 0,
      metrcPackages: counts.metrcPackages ?? 0,
      metrcTransfers: counts.metrcTransfers ?? 0
    },
    evidenceSummary: {
      sopRuns: {
        totalRuns: evidenceSummary?.sopRuns?.totalRuns ?? counts.sopRuns ?? 0,
        totalSteps: evidenceSummary?.sopRuns?.totalSteps ?? 0,
        doneSteps: evidenceSummary?.sopRuns?.doneSteps ?? 0,
        skippedSteps: evidenceSummary?.sopRuns?.skippedSteps ?? 0,
        pendingSteps: evidenceSummary?.sopRuns?.pendingSteps ?? 0,
        runsMissingSteps: evidenceSummary?.sopRuns?.runsMissingSteps ?? 0
      }
    }
  };
}

export default function FacilityAiAskRoute() {
  const params = useLocalSearchParams<{ preset?: string }>();
  const { selectedId: facilityId } = useFacility();
  const { callAI, loading, error, last } = useAICall(String(facilityId || ""));
  const { width } = useWindowDimensions();
  const isWide = width >= 960;
  const presetWidth = isWide ? "48.5%" : "100%";
  const initialPreset = useMemo(
    () => PRESETS.find((preset) => preset.key === params.preset) || PRESETS[0],
    [params.preset]
  );

  const [selected, setSelected] = useState<Preset>(initialPreset);
  const [growId, setGrowId] = useState("");
  const [tool, setTool] = useState(initialPreset.tool);
  const [fn, setFn] = useState(initialPreset.fn);
  const [argsJson, setArgsJson] = useState(pretty(initialPreset.args));
  const [localError, setLocalError] = useState("");
  const [loadingExport, setLoadingExport] = useState(false);
  const [exportSummary, setExportSummary] = useState("");
  const complianceResult = complianceResultFromLast(last);

  const canRun = useMemo(
    () => !!facilityId && tool.trim() && fn.trim() && argsJson.trim() && !loading,
    [argsJson, facilityId, fn, loading, tool]
  );
  const canRunSelected = canRun && (!selected.requiresGrow || Boolean(growId.trim()));

  function selectPreset(preset: Preset) {
    setSelected(preset);
    setTool(preset.tool);
    setFn(preset.fn);
    setArgsJson(pretty(preset.args));
    if (!preset.requiresGrow) {
      setGrowId("");
    }
    setLocalError("");
  }

  useEffect(() => {
    selectPreset(initialPreset);
  }, [initialPreset]);

  async function run(body?: Partial<AICallBody>, requiresGrow = false) {
    if (!canRun) return;
    if (requiresGrow && !growId.trim()) {
      setLocalError("Grow ID is required for this workflow.");
      return;
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(argsJson);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Args must be a JSON object.");
      }
    } catch (e: any) {
      setLocalError(e?.message || "Args must be valid JSON.");
      return;
    }

    setLocalError("");
    await callAI({
      tool: body?.tool || tool.trim(),
      fn: body?.fn || fn.trim(),
      args: body?.args || parsed,
      context: {
        facilityId: String(facilityId || ""),
        ...(growId.trim() ? { growId: growId.trim() } : {})
      }
    });
  }

  async function loadComplianceExportCounts() {
    if (!facilityId || loadingExport) return;
    setLoadingExport(true);
    setLocalError("");
    setExportSummary("");
    try {
      const packet = await getFacilityComplianceExport(String(facilityId));
      const counts = packet.counts || {};
      setSelected(PRESETS.find((preset) => preset.key === "compliance") || selected);
      setTool("compliance");
      setFn("buildReadinessChecklist");
      setArgsJson(pretty(readinessArgsFromCounts(counts, packet.evidenceSummary)));
      const total = Object.values(counts).reduce(
        (sum, value) => sum + Number(value || 0),
        0
      );
      setExportSummary(
        `Loaded ${total} export records generated ${new Date(
          packet.generatedAt
        ).toLocaleString()}.`
      );
    } catch (e: any) {
      setLocalError(e?.message || "Unable to load compliance export counts.");
    } finally {
      setLoadingExport(false);
    }
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Facility AI</Text>
        <Text style={styles.h1}>Command Center</Text>
        <Text style={styles.sub}>
          Run decision support for cultivation, compliance, inventory, and inspection
          workflows with facility context.
        </Text>
      </View>

      <View style={[styles.layout, isWide ? styles.layoutWide : null]}>
        <View style={styles.main}>
          <Text style={styles.sectionTitle}>Workflows</Text>
          <View style={styles.presetGrid}>
            {PRESETS.map((preset) => {
              const active = selected.key === preset.key;
              return (
                <Pressable
                  key={preset.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${preset.title} AI workflow`}
                  onPress={() => selectPreset(preset)}
                  style={({ pressed }) => [
                    styles.preset,
                    { width: presetWidth },
                    active && styles.presetActive,
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={styles.presetAudience}>{preset.audience}</Text>
                  <Text style={styles.presetTitle}>{preset.title}</Text>
                  <Text style={styles.presetSummary}>{preset.summary}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.panel}>
            <Text style={styles.cardTitle}>{selected.title}</Text>
            <Text style={styles.cardDesc}>{selected.summary}</Text>
            {selected.key === "compliance" ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Load compliance export counts"
                  onPress={loadComplianceExportCounts}
                  disabled={!facilityId || loadingExport}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    (!facilityId || loadingExport) && styles.disabled,
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {loadingExport ? "Loading export..." : "Load latest export counts"}
                  </Text>
                </Pressable>
                {exportSummary ? (
                  <Text style={styles.exportSummary}>{exportSummary}</Text>
                ) : null}
              </>
            ) : null}

            {selected.requiresGrow ? (
              <TextInput
                accessibilityLabel="AI grow id"
                value={growId}
                onChangeText={setGrowId}
                style={styles.input}
                placeholder="Grow ID"
                autoCapitalize="none"
              />
            ) : null}

            <TextInput
              accessibilityLabel="AI args JSON"
              value={argsJson}
              onChangeText={setArgsJson}
              style={[styles.input, styles.code]}
              placeholder="Args JSON"
              multiline
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Run ${selected.title} AI workflow`}
              onPress={() => run(undefined, Boolean(selected.requiresGrow))}
              disabled={!canRunSelected}
              style={({ pressed }) => [
                styles.button,
                !canRunSelected && styles.disabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.buttonText}>
                {loading ? "Running..." : `Run ${selected.title}`}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.side, isWide ? styles.sideWide : null]}>
          <View style={styles.panel}>
            <Text style={styles.cardTitle}>Custom tool call</Text>
            <Text style={styles.cardDesc}>
              Keep this for advanced users and support checks.
            </Text>
            <TextInput
              accessibilityLabel="Custom AI tool"
              value={tool}
              onChangeText={setTool}
              style={styles.input}
              placeholder="Tool"
              autoCapitalize="none"
            />
            <TextInput
              accessibilityLabel="Custom AI function"
              value={fn}
              onChangeText={setFn}
              style={styles.input}
              placeholder="Function"
              autoCapitalize="none"
            />
            <TextInput
              accessibilityLabel="Custom AI grow id"
              value={growId}
              onChangeText={setGrowId}
              style={styles.input}
              placeholder="Grow ID when required"
              autoCapitalize="none"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Run custom AI call"
              onPress={() => run()}
              disabled={!canRun}
              style={({ pressed }) => [
                styles.secondaryButton,
                !canRun && styles.disabled,
                pressed && styles.pressed
              ]}
            >
              <Text style={styles.secondaryButtonText}>Run custom call</Text>
            </Pressable>
          </View>

          {localError || error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {localError || `${error?.code}: ${error?.message}`}
              </Text>
            </View>
          ) : null}

          {last ? (
            <View style={styles.resultPanel}>
              <Text style={styles.resultTitle}>Last response</Text>
              {complianceResult ? (
                <View style={styles.readinessCard}>
                  <View style={styles.readinessHeader}>
                    <View>
                      <Text style={styles.readinessLabel}>Inspection readiness</Text>
                      <Text style={styles.readinessStatus}>
                        {String(complianceResult.status || "unknown")}
                      </Text>
                    </View>
                    <Text style={styles.readinessScore}>
                      {String(complianceResult.readinessScore ?? "--")}
                    </Text>
                  </View>
                  {complianceResult.evidenceSummary?.sopRuns ? (
                    <View style={styles.evidenceGrid}>
                      <Text style={styles.evidenceText}>
                        SOP runs:{" "}
                        {complianceResult.evidenceSummary.sopRuns.totalRuns ?? 0}
                      </Text>
                      <Text style={styles.evidenceText}>
                        Done steps:{" "}
                        {complianceResult.evidenceSummary.sopRuns.doneSteps ?? 0}/
                        {complianceResult.evidenceSummary.sopRuns.totalSteps ?? 0}
                      </Text>
                      <Text style={styles.evidenceText}>
                        Pending:{" "}
                        {complianceResult.evidenceSummary.sopRuns.pendingSteps ?? 0}
                      </Text>
                      <Text style={styles.evidenceText}>
                        Missing:{" "}
                        {complianceResult.evidenceSummary.sopRuns.runsMissingSteps ?? 0}
                      </Text>
                    </View>
                  ) : null}
                  {Array.isArray(complianceResult.issues) &&
                  complianceResult.issues.length ? (
                    <View style={styles.readinessSection}>
                      <Text style={styles.readinessSectionTitle}>Gaps</Text>
                      {complianceResult.issues.map((issue, idx) => (
                        <Text key={`${issue}-${idx}`} style={styles.issueText}>
                          {issue}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {Array.isArray(complianceResult.checklist) &&
                  complianceResult.checklist.length ? (
                    <View style={styles.readinessSection}>
                      <Text style={styles.readinessSectionTitle}>Checklist</Text>
                      {complianceResult.checklist.map((item, idx) => (
                        <Text
                          key={`${item.label || idx}-${idx}`}
                          style={styles.checkText}
                        >
                          {item.done === false ? "Open" : "Done"}:{" "}
                          {String(item.label || item.status || `Item ${idx + 1}`)}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
              <Text selectable style={styles.codeText}>
                {pretty(last)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: "#f4f6f3" },
  container: { padding: 16, paddingBottom: 32 },
  header: {
    backgroundColor: "#111827",
    borderRadius: 8,
    marginBottom: 14,
    padding: 18
  },
  kicker: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase"
  },
  h1: { color: "white", fontSize: 30, fontWeight: "900", marginBottom: 6 },
  sub: { color: "#cbd5e1", fontWeight: "700", maxWidth: 760 },
  layout: { gap: 14 },
  layoutWide: { alignItems: "flex-start", flexDirection: "row" },
  main: { flex: 1, minWidth: 0 },
  side: { gap: 12, width: "100%" },
  sideWide: { width: 390 },
  sectionTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10
  },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  preset: {
    backgroundColor: "white",
    borderColor: "#d7ddd2",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 132,
    padding: 14
  },
  presetActive: { borderColor: "#166534", borderWidth: 2 },
  presetAudience: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
    textTransform: "uppercase"
  },
  presetTitle: { color: "#111827", fontSize: 18, fontWeight: "900", marginBottom: 6 },
  presetSummary: { color: "#475569", fontWeight: "700", lineHeight: 20 },
  panel: {
    backgroundColor: "white",
    borderColor: "#d7ddd2",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  cardTitle: { color: "#111827", fontSize: 16, fontWeight: "900" },
  cardDesc: { color: "#64748b", fontWeight: "700", lineHeight: 20 },
  input: {
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  code: { fontFamily: "monospace", minHeight: 160, textAlignVertical: "top" },
  button: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingVertical: 12
  },
  buttonText: { color: "white", fontWeight: "900" },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 11
  },
  secondaryButtonText: { color: "white", fontWeight: "900" },
  exportSummary: { color: "#166534", fontSize: 13, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12
  },
  errorText: { color: "#991b1b", fontWeight: "800" },
  resultPanel: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    padding: 12
  },
  resultTitle: {
    color: "#bfdbfe",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
    textTransform: "uppercase"
  },
  readinessCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    gap: 10,
    marginBottom: 10,
    padding: 10
  },
  readinessHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  readinessLabel: { color: "#475569", fontSize: 12, fontWeight: "900" },
  readinessStatus: { color: "#111827", fontSize: 18, fontWeight: "900" },
  readinessScore: { color: "#166534", fontSize: 34, fontWeight: "900" },
  evidenceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  evidenceText: {
    backgroundColor: "#e0f2fe",
    borderRadius: 6,
    color: "#075985",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  readinessSection: { gap: 4 },
  readinessSectionTitle: { color: "#334155", fontSize: 12, fontWeight: "900" },
  issueText: { color: "#991b1b", fontSize: 12, fontWeight: "800" },
  checkText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  codeText: { color: "white", fontFamily: "monospace", fontSize: 12 }
});
