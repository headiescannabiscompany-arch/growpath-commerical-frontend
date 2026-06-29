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

  const canRun = useMemo(
    () => !!facilityId && tool.trim() && fn.trim() && argsJson.trim() && !loading,
    [argsJson, facilityId, fn, loading, tool]
  );

  function selectPreset(preset: Preset) {
    setSelected(preset);
    setTool(preset.tool);
    setFn(preset.fn);
    setArgsJson(pretty(preset.args));
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
              disabled={!canRun}
              style={({ pressed }) => [
                styles.button,
                (!canRun || (selected.requiresGrow && !growId.trim())) && styles.disabled,
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
  codeText: { color: "white", fontFamily: "monospace", fontSize: 12 }
});
