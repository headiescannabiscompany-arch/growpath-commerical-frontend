import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { analyzeEnvironment } from "@/api/environment";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import {
  buildEnvironmentContextAssumption,
  buildEnvironmentContextNotices
} from "@/features/personal/tools/environmentContext";
import { reviewEnvironmentReadings } from "@/features/personal/tools/environmentReview";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateLog,
  saveToolRunAndCreateTask
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";
import { askPersonalAssistant } from "@/api/personalAssistant";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function numeric(value: string) {
  if (!value.trim()) return undefined;
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

function resultToolRunId(result: any) {
  return String(result?.toolRun?.id || result?.toolRun?._id || "").trim();
}

function dueTomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function environmentTaskMetadata(hasRisk: boolean) {
  return {
    allDay: true,
    calendarType: "environment_analysis_followup",
    sourceStage: hasRisk ? "environment_risk_inspection" : "environment_analysis_review",
    reminderPlan: {
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -12 * 60 }]
    }
  };
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
  const [lightHours, setLightHours] = useState("");
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
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
          workflow: "environment-analysis",
          requestedFields: [
            "stage",
            "tempDayC",
            "tempNightC",
            "humidity",
            "vpd",
            "ppfd",
            "dli",
            "co2",
            "lightHours"
          ]
        },
        message: `Prefill this Environment Review from the selected grow/room's recent telemetry, device integrations, light schedule, stage history, environmental logs, alerts, and plant response. Return JSON only with exactly these string keys: stage, tempDayC, tempNightC, humidity, vpd, ppfd, dli, co2, lightHours. Every numeric field must come from a saved sensor reading or explicit measurement. Use a representative recent window and distinguish lights-on, lights-off, transitions, peaks, lows, and averages; do not mix readings from different rooms or time windows. Never estimate PPFD, DLI, CO2, temperature, or RH from photos. Leave unavailable or stale values blank. VPD and dew point will be recalculated by the deterministic environment engine.`
      });
      const raw = String(response.reply || "");
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const parsed = JSON.parse(fenced?.[1] || raw.slice(raw.indexOf("{")));
      setStage(String(parsed.stage ?? ""));
      setTempDayC(String(parsed.tempDayC ?? ""));
      setTempNightC(String(parsed.tempNightC ?? ""));
      setHumidity(String(parsed.humidity ?? ""));
      setVpd(String(parsed.vpd ?? ""));
      setPpfd(String(parsed.ppfd ?? ""));
      setDli(String(parsed.dli ?? ""));
      setCo2(String(parsed.co2 ?? ""));
      setLightHours(String(parsed.lightHours ?? ""));
      setResult(null);
      setFeedback(
        `AI filled recent recorded environment values. Review the time window before running the environment engine.${response.missingInformation?.length ? ` Missing or stale: ${response.missingInformation.join(", ")}.` : ""}`
      );
    } catch (error: any) {
      setFeedback(error?.message || "AI could not prefill the environment review.");
    } finally {
      setPrefilling(false);
    }
  }

  const assessment = result?.data?.currentAssessment ?? result?.currentAssessment ?? {};
  const recommendations = actionList(result);
  const environmentReview = useMemo(
    () =>
      reviewEnvironmentReadings({
        stage,
        tempDayC: numeric(tempDayC),
        tempNightC: numeric(tempNightC),
        humidity: numeric(humidity),
        vpd: numeric(vpd),
        ppfd: numeric(ppfd),
        dli: numeric(dli),
        co2: numeric(co2),
        lightHours: numeric(lightHours)
      }),
    [co2, dli, humidity, lightHours, ppfd, stage, tempDayC, tempNightC, vpd]
  );

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
      toolRunId: resultToolRunId(result),
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
        `Local environment risk: ${environmentReview.riskLevel}`,
        environmentReview.dewPointC != null
          ? `Dew point: ${environmentReview.dewPointC}C / spread ${environmentReview.dewPointSpreadC}C`
          : "",
        environmentReview.warnings.length
          ? `Local warnings: ${environmentReview.warnings.join("; ")}`
          : "",
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
    <ScreenBoundary
      title="Environment Review"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Environment Review</Text>
        <Text style={styles.subtitle}>
          Review grow-room readings with GrowPath rules, then save the result or create a
          linked follow-up task. This review uses no AI credits.
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_environment_analysis"
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
          <Text style={styles.aiTitle}>AI telemetry prefill</Text>
          <Text style={styles.aiText}>
            Fill recent measured values and identify missing or stale sensors. GrowPath
            rules still calculate VPD, dew point, and risk.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fill environment review from grow"
            disabled={!growId || prefilling}
            onPress={prefillFromGrow}
            style={[styles.button, (!growId || prefilling) && styles.disabled]}
          >
            <Text style={styles.buttonText}>
              {prefilling
                ? "Reviewing telemetry..."
                : "Fill environment review from grow"}
            </Text>
          </Pressable>
        </View>

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

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_tools_environment_analysis"
          longContent
        />

        <ToolResultSurface
          title="Environment analysis"
          status={
            result ? String(assessment.status || "RULE REVIEW").toUpperCase() : "READY"
          }
          summary={
            result?.data?.notes ||
            result?.notes ||
            "Run the endpoint to analyze readings."
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
            { key: "vpd", label: "Ideal VPD", value: targetValue(result, "vpdIdeal") },
            {
              key: "local-risk",
              label: "Local risk",
              value: environmentReview.riskLevel.toUpperCase(),
              detail:
                environmentReview.dewPointC == null
                  ? `${environmentReview.warnings.length} warnings`
                  : `Dew point ${environmentReview.dewPointC}C, spread ${environmentReview.dewPointSpreadC}C`
            }
          ]}
          notices={[
            ...buildEnvironmentContextNotices(plantContext.selectedPlantContext),
            ...environmentReview.warnings.map((warning, index) => ({
              key: `local-warning-${index}`,
              severity:
                environmentReview.riskLevel === "high"
                  ? ("high" as const)
                  : ("medium" as const),
              message: warning
            })),
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
            "GrowPath's rule engine supplies the review and recommendations without using AI credits.",
            ...environmentReview.recommendations,
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
                        toolRunId: resultToolRunId(result),
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
                        title:
                          environmentReview.riskLevel === "high"
                            ? "Inspect environment risk zones"
                            : "Review environment analysis",
                        description: [
                          `Status: ${assessment.status || "analysis complete"}`,
                          `Local risk: ${environmentReview.riskLevel}`,
                          ...environmentReview.warnings.map(
                            (warning) => `Warning: ${warning}`
                          ),
                          issues.length ? `Issues: ${issues.join("; ")}` : "",
                          riskFlags.length ? `Risk flags: ${riskFlags.join("; ")}` : "",
                          recommendations.length
                            ? `Recommended actions: ${recommendations.join("; ")}`
                            : ""
                        ]
                          .filter(Boolean)
                          .join("\n"),
                        priority:
                          riskFlags.length || environmentReview.riskLevel === "high"
                            ? "high"
                            : "medium",
                        dueDate: dueTomorrow(),
                        ...environmentTaskMetadata(
                          riskFlags.length > 0 || environmentReview.riskLevel === "high"
                        )
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

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_environment_analysis"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
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
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  disabled: { opacity: 0.5 },
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
  locked: {
    color: "#991B1B",
    backgroundColor: "#FEE2E2",
    borderRadius: radius.card,
    padding: 9
  }
});
