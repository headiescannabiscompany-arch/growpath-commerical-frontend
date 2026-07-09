import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { generateSchedule } from "@/api/feeding";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import LockedToolCard from "@/features/personal/tools/LockedToolCard";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import {
  saveToolRunAndCreateLog,
  saveToolRunAndCreateTask
} from "@/features/personal/tools/saveToolRunAndOpenJournal";
import { reviewFeedingSchedule } from "@/features/personal/tools/feedingScheduleReview";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function rowsFromSchedule(result: any): any[] {
  const schedule =
    result?.data?.schedule?.schedule ??
    result?.schedule?.schedule ??
    result?.data?.schedule ??
    result?.schedule ??
    [];
  return Array.isArray(schedule) ? schedule : [];
}

function notesFromSchedule(result: any) {
  return String(
    result?.data?.notes ||
      result?.notes ||
      result?.data?.schedule?.notes ||
      result?.schedule?.notes ||
      ""
  );
}

function dueTomorrow() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export default function FeedingScheduleToolScreen() {
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const initialPlantId = useMemo(() => coerceParam(rawPlantId), [rawPlantId]);
  const plantContext = useToolPlantContext(growId, initialPlantId);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.FEEDING_SCHEDULE);

  const [productName, setProductName] = useState("Base nutrient");
  const [medium, setMedium] = useState("Soil");
  const [strainType, setStrainType] = useState("Photoperiod");
  const [currentStage, setCurrentStage] = useState("veg");
  const [experience, setExperience] = useState("Intermediate");
  const [weeks, setWeeks] = useState("12");
  const [inputEC, setInputEC] = useState("");
  const [runoffEC, setRunoffEC] = useState("");
  const [inputPH, setInputPH] = useState("");
  const [runoffPH, setRunoffPH] = useState("");
  const [waterSource, setWaterSource] = useState("");
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState("");

  const scheduleRows = rowsFromSchedule(result);
  const notes = notesFromSchedule(result);
  const review = useMemo(
    () =>
      reviewFeedingSchedule({
        schedule: scheduleRows,
        productName: productName.trim(),
        medium,
        stage: currentStage,
        inputEC: inputEC.trim() ? Number(inputEC) : undefined,
        runoffEC: runoffEC.trim() ? Number(runoffEC) : undefined,
        inputPH: inputPH.trim() ? Number(inputPH) : undefined,
        runoffPH: runoffPH.trim() ? Number(runoffPH) : undefined,
        waterSource
      }),
    [
      currentStage,
      inputEC,
      medium,
      productName,
      runoffEC,
      inputPH,
      runoffPH,
      scheduleRows,
      waterSource
    ]
  );

  async function run() {
    if (!enabled || running) return;
    setRunning(true);
    setFeedback("");
    setResult(null);
    try {
      const response = await generateSchedule({
        growId: growId || undefined,
        ...plantContext.toolRunContext,
        nutrientData: { productName: productName.trim() },
        growMedium: medium.trim(),
        strainType: strainType.trim(),
        experience: experience.trim(),
        weeks: Number(weeks),
        stage: currentStage.trim(),
        inputEC: Number(inputEC),
        runoffEC: Number(runoffEC),
        inputPH: Number(inputPH),
        runoffPH: Number(runoffPH),
        waterSource: waterSource.trim()
      });
      setResult(response);
      if (!rowsFromSchedule(response).length) {
        setFeedback("The feeding endpoint returned no schedule rows.");
      }
    } catch (error: any) {
      setFeedback(error?.message || "Unable to generate feeding schedule.");
    } finally {
      setRunning(false);
    }
  }

  async function saveLog() {
    if (!growId || !result) throw new Error("Select a grow before saving.");
    const input = {
      nutrientData: { productName: productName.trim() },
      growMedium: medium.trim(),
      strainType: strainType.trim(),
      experience: experience.trim(),
      weeks: Number(weeks),
      stage: currentStage.trim(),
      inputEC: Number(inputEC),
      runoffEC: Number(runoffEC),
      inputPH: Number(inputPH),
      runoffPH: Number(runoffPH),
      waterSource: waterSource.trim()
    };
    const created = await saveToolRunAndCreateLog({
      growId,
      ...plantContext.toolRunContext,
      toolKey: "feeding-schedule",
      input,
      output: result,
      type: "feed",
      date: new Date().toISOString().slice(0, 10),
      title: `${productName.trim() || "Nutrient"} feeding schedule`,
      notes: [
        `Medium: ${medium}`,
        `Stage: ${currentStage}`,
        `Review risk: ${review.riskLevel}`,
        `Strain type: ${strainType}`,
        plantContext.selectedPlantContext
          ? `Plant: ${plantContext.selectedPlantContext.name || plantContext.selectedPlantContext.cropCommonName || "selected plant"}`
          : "",
        plantContext.selectedPlantContext?.scientificName
          ? `Species: ${plantContext.selectedPlantContext.scientificName}`
          : "",
        notes,
        ...review.warnings.map((warning) => `Warning: ${warning}`),
        ...scheduleRows.map(
          (row) =>
            `Week ${row.week ?? "?"}: ${row.stage || "stage"} - ${row.feed?.amountPerGallon || row.amount || "dose not specified"}`
        )
      ]
        .filter(Boolean)
        .join("\n"),
      tags: ["feeding", "ai_schedule"]
    });
    if (!created.ok) throw new Error(created.error);
    setFeedback("Saved feeding schedule to grow journal.");
  }

  return (
    <ScreenBoundary
      title="AI Feeding Schedule"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>AI Feeding Schedule</Text>
        <Text style={styles.subtitle}>
          Generate a feeding plan from nutrient, medium, strain, and schedule context.
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_feeding_schedule"
          longContent
        />
        {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
        <ToolPlantContextPicker
          plants={plantContext.plants}
          plantId={plantContext.plantId}
          selectedPlant={plantContext.selectedPlant}
          onSelect={plantContext.setPlantId}
        />

        <Text style={styles.label}>Product or nutrient line</Text>
        <TextInput
          accessibilityLabel="Feeding product or nutrient line"
          style={styles.input}
          value={productName}
          onChangeText={setProductName}
        />
        <Text style={styles.label}>Grow medium</Text>
        <TextInput
          accessibilityLabel="Feeding grow medium"
          style={styles.input}
          value={medium}
          onChangeText={setMedium}
        />
        <Text style={styles.label}>Strain type</Text>
        <TextInput
          accessibilityLabel="Feeding strain type"
          style={styles.input}
          value={strainType}
          onChangeText={setStrainType}
        />
        <Text style={styles.label}>Current stage</Text>
        <TextInput
          accessibilityLabel="Feeding current stage"
          style={styles.input}
          value={currentStage}
          onChangeText={setCurrentStage}
        />
        <Text style={styles.label}>Experience</Text>
        <TextInput
          accessibilityLabel="Feeding experience"
          style={styles.input}
          value={experience}
          onChangeText={setExperience}
        />
        <Text style={styles.label}>Total weeks</Text>
        <TextInput
          accessibilityLabel="Feeding total weeks"
          style={styles.input}
          value={weeks}
          onChangeText={setWeeks}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Input EC</Text>
        <TextInput
          accessibilityLabel="Feeding input EC"
          style={styles.input}
          value={inputEC}
          onChangeText={setInputEC}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Runoff EC</Text>
        <TextInput
          accessibilityLabel="Feeding runoff EC"
          style={styles.input}
          value={runoffEC}
          onChangeText={setRunoffEC}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Input pH</Text>
        <TextInput
          accessibilityLabel="Feeding input pH"
          style={styles.input}
          value={inputPH}
          onChangeText={setInputPH}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Runoff pH</Text>
        <TextInput
          accessibilityLabel="Feeding runoff pH"
          style={styles.input}
          value={runoffPH}
          onChangeText={setRunoffPH}
          keyboardType="numeric"
        />
        <Text style={styles.label}>Water source</Text>
        <TextInput
          accessibilityLabel="Feeding water source"
          style={styles.input}
          value={waterSource}
          onChangeText={setWaterSource}
          placeholder="RO, city, well, rain"
        />

        {!enabled ? (
          <LockedToolCard
            title="AI Feeding Schedule"
            capability={CAPABILITY_KEYS.FEEDING_SCHEDULE}
            description="Generate stage-aware feeding plans after this capability is enabled for the account."
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Generate feeding schedule"
          style={[styles.button, (!enabled || running) && styles.disabled]}
          disabled={!enabled || running}
          onPress={run}
        >
          <Text style={styles.buttonText}>
            {running ? "Generating..." : "Generate Schedule"}
          </Text>
        </Pressable>

        <PersonalFeedPlacement
          placement="middle"
          routeKey="personal_tools_feeding_schedule"
          longContent
        />

        <ToolResultSurface
          title="Feeding schedule"
          status={result ? "AI ENDPOINT" : "READY"}
          summary={notes || "Run the endpoint to generate a schedule."}
          metrics={[
            { key: "weeks", label: "Requested weeks", value: weeks || "0" },
            { key: "rows", label: "Schedule rows", value: String(scheduleRows.length) },
            { key: "medium", label: "Medium", value: medium || "Unspecified" },
            { key: "stage", label: "Stage", value: currentStage || "Unspecified" },
            {
              key: "risk",
              label: "Review risk",
              value: review.riskLevel.toUpperCase(),
              detail: `${review.warnings.length} warnings`
            }
          ]}
          details={
            scheduleRows.length ? (
              <View style={styles.rows}>
                {scheduleRows.slice(0, 8).map((row, index) => (
                  <Text key={`${row.week || index}`} style={styles.rowText}>
                    Week {row.week ?? index + 1}: {row.stage || "stage"} |{" "}
                    {row.feed?.amountPerGallon || row.amount || "dose pending"}
                  </Text>
                ))}
              </View>
            ) : undefined
          }
          assumptions={[
            "Backend schedule output is authoritative for entitlement and endpoint behavior.",
            ...review.warnings,
            ...review.recommendations,
            "Confirm product label rates, local regulations, runoff, EC, and plant response before applying."
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
                    label: "Create Feeding Review Task",
                    variant: "secondary",
                    pendingLabel: "Creating...",
                    onPress: async () => {
                      const taskResult = await saveToolRunAndCreateTask({
                        growId,
                        ...plantContext.toolRunContext,
                        toolKey: "feeding-schedule",
                        input: {
                          nutrientData: { productName: productName.trim() },
                          growMedium: medium.trim(),
                          strainType: strainType.trim(),
                          experience: experience.trim(),
                          weeks: Number(weeks),
                          stage: currentStage.trim(),
                          inputEC: Number(inputEC),
                          runoffEC: Number(runoffEC),
                          inputPH: Number(inputPH),
                          runoffPH: Number(runoffPH),
                          waterSource: waterSource.trim()
                        },
                        output: result,
                        title: "Review generated feeding schedule",
                        description: [
                          `Product: ${productName.trim() || "Unspecified"}`,
                          `Medium: ${medium}`,
                          `Stage: ${currentStage}`,
                          `Risk: ${review.riskLevel}`,
                          `Rows: ${scheduleRows.length}`,
                          ...review.warnings.map((warning) => `Warning: ${warning}`),
                          notes
                        ]
                          .filter(Boolean)
                          .join("\n"),
                        priority: "medium",
                        dueDate: dueTomorrow()
                      });
                      if (!taskResult.ok) throw new Error(taskResult.error);
                      setFeedback("Created feeding review task.");
                    }
                  }
                ]
              : []
          }
          feedback={feedback}
          contextMessage={!growId ? "Select a grow to save this schedule." : undefined}
        />

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_feeding_schedule"
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
  rows: { gap: 5 },
  rowText: { color: "#334155", lineHeight: 19 }
});
