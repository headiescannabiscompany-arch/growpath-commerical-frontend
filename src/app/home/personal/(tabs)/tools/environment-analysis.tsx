import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { analyzeEnvironment } from "@/api/environment";
import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import {
  buildEnvironmentContextAssumption,
  buildEnvironmentContextNotices
} from "@/features/personal/tools/environmentContext";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateLog,
  saveToolRunAndCreateTask
} from "@/features/personal/tools/saveToolRunAndOpenJournal";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function numeric(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function list(value: any): string[] {
  return Array.isArray(value)
    ? value
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function actionList(result: any): string[] {
  const actions =
    result?.data?.recommendations?.actions ??
    result?.recommendations?.actions ??
    result?.actions ??
    [];
  if (!Array.isArray(actions)) return [];
  return actions
    .map((action) =>
      typeof action === "string"
        ? action
        : [
            action?.title,
            action?.details,
            action?.priority ? `Priority: ${action.priority}` : ""
          ]
            .filter(Boolean)
            .join(" - ")
    )
    .filter(Boolean);
}

function targetValue(result: any, key: string) {
  const targets = result?.data?.targets ?? result?.targets ?? {};
  const value = targets[key];
  return value === undefined || value === null || value === "" ? "n/a" : String(value);
}

function dueTomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export default function EnvironmentAnalysisToolScreen() {
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const initialPlantId = useMemo(() => coerceParam(rawPlantId), [rawPlantId]);
  const plantContext = useToolPlantContext(growId, initialPlantId);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.AI_ASSISTANT);

  const [stage, setStage] = useState("Veg");
  const [tempDayC, setTempDayC] = useState("");
  const [tempNightC, setTempNightC] = useState("");
  const [humidity, setHumidity] = useState("");
  const [vpd, setVpd] = useState("");
  const [ppfd, setPpfd] = useState("");
  const [dli, setDli] = useState("");
  const [co2, setCo2] = useState("");
  const [lightHours, setLightHours] = useState("18");
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState("");

  const assessment = result?.data?.currentAssessment ?? result?.currentAssessment ?? {};
  const recommendations = actionList(result);

  async function run() {
    if (!enabled || running) return;
    setRunning(true);
    setFeedback("");
    setResult(null);
    try {
      const response = await analyzeEnvironment({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        stage,
        tempDayC: numeric(tempDayC),
        tempNightC: numeric(tempNightC),
        humidity: numeric(humidity),
        vpd: numeric(vpd),
        ppfd: numeric(ppfd),
        dli: numeric(dli),
        co2: numeric(co2),
        lightHours: numeric(lightHours)
      });
      setResult(response);
    } catch (error: any) {
      setFeedback(error?.message || "Unable to analyze environment.");
    } finally {
      setRunning(false);
    }
  }

  async function saveLog() {
    if (!growId || !result) throw new Error("Select a grow before saving.");
    const issues = list(assessment.issues);
    const riskFlags = list(assessment.riskFlags);
    const created = await saveToolRunAndCreateLog({
      growId,
      ...plantContext.toolRunContext,
      toolKey: "environment-analysis",
      input: {
        stage,
        tempDayC: numeric(tempDayC),
        tempNightC: numeric(tempNightC),
        humidity: numeric(humidity),
        vpd: numeric(vpd),
        ppfd: numeric(ppfd),
        dli: numeric(dli),
        co2: numeric(co2),
        lightHours: numeric(lightHours)
      },
      output: result,
      type: "environment",
      date: new Date().toISOString().slice(0, 10),
      title: `Environment analysis: ${assessment.status || stage}`,
      notes: [
        `Stage: ${stage}`,
        plantContext.selectedPlantContext
          ? `Plant: ${plantContext.selectedPlantContext.name || plantContext.selectedPlantContext.cropCommonName || "selected plant"}`
          : "",
        plantContext.selectedPlantContext?.scientificName
          ? `Species: ${plantContext.selectedPlantContext.scientificName}`
          : "",
        `Status: ${assessment.status || "n/a"}`,
        issues.length ? `Issues: ${issues.join("; ")}` : "",
        riskFlags.length ? `Risk flags: ${riskFlags.join("; ")}` : "",
        recommendations.length ? `Actions: ${recommendations.join("; ")}` : ""
      ]
        .filter(Boolean)
        .join("\n"),
      tags: ["environment", "ai_analysis"]
    });
    if (!created.ok) throw new Error(created.error);
    setFeedback("Saved environment analysis to grow journal.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>AI Environment Analysis</Text>
      <Text style={styles.subtitle}>
        Send grow-room readings to the environment analysis endpoint for target ranges,
        risk flags, and adjustment recommendations.
      </Text>
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
      <ToolPlantContextPicker
        plants={plantContext.plants}
        plantId={plantContext.plantId}
        selectedPlant={plantContext.selectedPlant}
        onSelect={plantContext.setPlantId}
      />

      <Text style={styles.label}>Stage</Text>
      <TextInput
        accessibilityLabel="Environment stage"
        style={styles.input}
        value={stage}
        onChangeText={setStage}
      />
      <View style={styles.grid}>
        <View style={styles.field}>
          <Text style={styles.label}>Day temp C</Text>
          <TextInput
            accessibilityLabel="Environment day temperature Celsius"
            style={styles.input}
            value={tempDayC}
            onChangeText={setTempDayC}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Night temp C</Text>
          <TextInput
            accessibilityLabel="Environment night temperature Celsius"
            style={styles.input}
            value={tempNightC}
            onChangeText={setTempNightC}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Humidity %</Text>
          <TextInput
            accessibilityLabel="Environment humidity percent"
            style={styles.input}
            value={humidity}
            onChangeText={setHumidity}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>VPD kPa</Text>
          <TextInput
            accessibilityLabel="Environment VPD kPa"
            style={styles.input}
            value={vpd}
            onChangeText={setVpd}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>PPFD</Text>
          <TextInput
            accessibilityLabel="Environment PPFD"
            style={styles.input}
            value={ppfd}
            onChangeText={setPpfd}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>DLI</Text>
          <TextInput
            accessibilityLabel="Environment DLI"
            style={styles.input}
            value={dli}
            onChangeText={setDli}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>CO2 ppm</Text>
          <TextInput
            accessibilityLabel="Environment CO2 ppm"
            style={styles.input}
            value={co2}
            onChangeText={setCo2}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Light hours</Text>
          <TextInput
            accessibilityLabel="Environment light hours"
            style={styles.input}
            value={lightHours}
            onChangeText={setLightHours}
            keyboardType="numeric"
          />
        </View>
      </View>

      {!enabled ? (
        <Text style={styles.locked}>Environment AI is unavailable for this plan.</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Analyze environment"
        style={[styles.button, (!enabled || running) && styles.disabled]}
        disabled={!enabled || running}
        onPress={run}
      >
        <Text style={styles.buttonText}>
          {running ? "Analyzing..." : "Analyze Environment"}
        </Text>
      </Pressable>

      <ToolResultSurface
        title="Environment analysis"
        status={
          result ? String(assessment.status || "AI ENDPOINT").toUpperCase() : "READY"
        }
        summary={
          result?.data?.notes || result?.notes || "Run the endpoint to analyze readings."
        }
        metrics={[
          {
            key: "day-temp",
            label: "Target day temp",
            value: targetValue(result, "tempDayC")
          },
          {
            key: "rh-min",
            label: "Target RH min",
            value: targetValue(result, "humidityMin")
          },
          {
            key: "rh-max",
            label: "Target RH max",
            value: targetValue(result, "humidityMax")
          },
          { key: "vpd", label: "Ideal VPD", value: targetValue(result, "vpdIdeal") }
        ]}
        notices={[
          ...buildEnvironmentContextNotices(plantContext.selectedPlantContext),
          ...list(assessment.issues).map((issue, index) => ({
            key: `issue-${index}`,
            severity: "medium" as const,
            message: issue
          })),
          ...list(assessment.riskFlags).map((risk, index) => ({
            key: `risk-${index}`,
            severity: "high" as const,
            message: risk
          }))
        ]}
        recommendations={recommendations}
        assumptions={[
          "The backend environment endpoint supplies the targets and recommendations.",
          buildEnvironmentContextAssumption(plantContext.selectedPlantContext),
          "Confirm sensor calibration, canopy position, and plant response before changing controls."
        ]}
        actions={
          result && growId
            ? [
                {
                  key: "save-log",
                  label: "Save to Grow Log",
                  onPress: saveLog,
                  pendingLabel: "Saving..."
                },
                {
                  key: "create-task",
                  label: "Create Environment Task",
                  variant: "secondary",
                  pendingLabel: "Creating...",
                  onPress: async () => {
                    const issues = list(assessment.issues);
                    const riskFlags = list(assessment.riskFlags);
                    const taskResult = await saveToolRunAndCreateTask({
                      growId,
                      ...plantContext.toolRunContext,
                      toolKey: "environment-analysis",
                      input: {
                        stage,
                        tempDayC: numeric(tempDayC),
                        tempNightC: numeric(tempNightC),
                        humidity: numeric(humidity),
                        vpd: numeric(vpd),
                        ppfd: numeric(ppfd),
                        dli: numeric(dli),
                        co2: numeric(co2),
                        lightHours: numeric(lightHours)
                      },
                      output: result,
                      title: "Review environment analysis",
                      description: [
                        `Status: ${assessment.status || "analysis complete"}`,
                        issues.length ? `Issues: ${issues.join("; ")}` : "",
                        riskFlags.length ? `Risk flags: ${riskFlags.join("; ")}` : "",
                        recommendations.length
                          ? `Recommended actions: ${recommendations.join("; ")}`
                          : ""
                      ]
                        .filter(Boolean)
                        .join("\n"),
                      priority: riskFlags.length ? "high" : "medium",
                      dueDate: dueTomorrow()
                    });
                    if (!taskResult.ok) throw new Error(taskResult.error);
                    setFeedback("Created environment review task.");
                  }
                }
              ]
            : []
        }
        feedback={feedback}
        contextMessage={!growId ? "Select a grow to save this analysis." : undefined}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: "#FFFFFF", gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  context: { color: "#166534", fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  field: { minWidth: 140, flexGrow: 1, flexBasis: "45%" },
  label: { color: "#334155", fontWeight: "800", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 9, padding: 10 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.5 },
  locked: { color: "#991B1B", backgroundColor: "#FEE2E2", borderRadius: 9, padding: 9 }
});
