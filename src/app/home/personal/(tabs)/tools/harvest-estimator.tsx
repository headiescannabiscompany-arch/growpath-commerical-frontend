import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";

import BackButton from "@/components/nav/BackButton";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  estimateHarvestWindow,
  type HarvestEstimatorInput
} from "@/features/personal/tools/advancedPlanning";
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
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dueInDays(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export default function HarvestEstimatorScreen() {
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const initialPlantId = useMemo(() => coerceParam(rawPlantId), [rawPlantId]);
  const plantContext = useToolPlantContext(growId, initialPlantId);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_HARVEST_ESTIMATOR);
  const [floweringDay, setFloweringDay] = useState("49");
  const [breederFlowerDays, setBreederFlowerDays] = useState("63");
  const [cloudyPct, setCloudyPct] = useState("60");
  const [amberPct, setAmberPct] = useState("8");
  const [pistilDarkPct, setPistilDarkPct] = useState("70");
  const [budSwellStatus, setBudSwellStatus] = useState("mostly swollen");
  const [aromaTrend, setAromaTrend] = useState("building");
  const [sampleLocation, setSampleLocation] = useState("mixed bud sites");
  const [userGoal, setUserGoal] =
    useState<NonNullable<HarvestEstimatorInput["userGoal"]>>("balanced");
  const [cultivarSpeed, setCultivarSpeed] =
    useState<HarvestEstimatorInput["cultivarSpeed"]>("average");
  const [feedback, setFeedback] = useState("");

  const input = useMemo<HarvestEstimatorInput>(
    () => ({
      floweringDay: numberValue(floweringDay, 0),
      breederFlowerDays: numberValue(breederFlowerDays, 63),
      cloudyPct: numberValue(cloudyPct, 0),
      amberPct: numberValue(amberPct, 0),
      pistilDarkPct: numberValue(pistilDarkPct, 0),
      cultivarSpeed,
      budSwellStatus,
      aromaTrend,
      sampleLocation,
      userGoal
    }),
    [
      amberPct,
      aromaTrend,
      breederFlowerDays,
      budSwellStatus,
      cloudyPct,
      cultivarSpeed,
      floweringDay,
      pistilDarkPct,
      sampleLocation,
      userGoal
    ]
  );
  const result = useMemo(() => estimateHarvestWindow(input), [input]);

  async function saveEstimate() {
    if (!growId) throw new Error("Select a grow before saving.");
    const created = await saveToolRunAndCreateLog({
      growId,
      ...plantContext.toolRunContext,
      toolKey: "harvest-estimator",
      input,
      output: result,
      type: "harvest",
      date: new Date().toISOString().slice(0, 10),
      title: "Harvest window estimate",
      notes: [
        result.summary,
        `Target flowering day: ${result.targetDay}`,
        `Window: day ${result.earliestDay}-${result.latestDay}`,
        ...result.evidence,
        ...result.warnings.map((warning) => `Warning: ${warning}`)
      ].join("\n"),
      tags: ["harvest", "estimator"]
    });
    if (!created.ok) throw new Error(created.error);
    setFeedback("Saved harvest estimate to grow journal.");
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <Text style={styles.title}>Harvest Estimator</Text>
      <Text style={styles.subtitle}>
        Estimate a harvest window from flowering day, breeder timing, trichomes, pistils,
        and cultivar speed.
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_tools_harvest_estimator"
        longContent
      />
      {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}
      <ToolPlantContextPicker
        plants={plantContext.plants}
        plantId={plantContext.plantId}
        selectedPlant={plantContext.selectedPlant}
        onSelect={plantContext.setPlantId}
      />

      {!enabled ? (
        <LockedToolCard
          title="Harvest Estimator"
          capability={CAPABILITY_KEYS.TOOL_HARVEST_ESTIMATOR}
          description="Enable this capability to calculate and save harvest readiness estimates."
        />
      ) : (
        <>
          <Text style={styles.label}>Flowering day</Text>
          <TextInput
            style={styles.input}
            value={floweringDay}
            onChangeText={setFloweringDay}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Breeder flower days</Text>
          <TextInput
            style={styles.input}
            value={breederFlowerDays}
            onChangeText={setBreederFlowerDays}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Cloudy trichomes (%)</Text>
          <TextInput
            style={styles.input}
            value={cloudyPct}
            onChangeText={setCloudyPct}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Amber trichomes (%)</Text>
          <TextInput
            style={styles.input}
            value={amberPct}
            onChangeText={setAmberPct}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Dark pistils (%)</Text>
          <TextInput
            style={styles.input}
            value={pistilDarkPct}
            onChangeText={setPistilDarkPct}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Bud/calyx swell</Text>
          <TextInput
            style={styles.input}
            value={budSwellStatus}
            onChangeText={setBudSwellStatus}
            placeholder="still swelling, mostly swollen, fully swollen"
          />
          <Text style={styles.label}>Aroma trend</Text>
          <TextInput
            style={styles.input}
            value={aromaTrend}
            onChangeText={setAromaTrend}
            placeholder="building, peaking, fading"
          />
          <Text style={styles.label}>Trichome sample location</Text>
          <TextInput
            style={styles.input}
            value={sampleLocation}
            onChangeText={setSampleLocation}
            placeholder="top cola, mid canopy, mixed bud sites"
          />
          <Text style={styles.label}>Cultivar speed</Text>
          <ScrollView horizontal contentContainerStyle={styles.pills}>
            {(["fast", "average", "slow"] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.pill, cultivarSpeed === value && styles.pillOn]}
                onPress={() => setCultivarSpeed(value)}
              >
                <Text
                  style={[styles.pillText, cultivarSpeed === value && styles.pillTextOn]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.label}>Effect goal</Text>
          <ScrollView horizontal contentContainerStyle={styles.pills}>
            {(["brighter", "balanced", "heavier", "hash", "unknown"] as const).map(
              (value) => (
                <Pressable
                  key={value}
                  style={[styles.pill, userGoal === value && styles.pillOn]}
                  onPress={() => setUserGoal(value)}
                >
                  <Text
                    style={[styles.pillText, userGoal === value && styles.pillTextOn]}
                  >
                    {value}
                  </Text>
                </Pressable>
              )
            )}
          </ScrollView>

          <PersonalFeedPlacement
            placement="middle"
            routeKey="personal_tools_harvest_estimator"
            longContent
          />

          <ToolResultSurface
            title="Harvest estimate"
            status={result.readiness.toUpperCase()}
            summary={result.summary}
            metrics={[
              {
                key: "remaining",
                label: "Days remaining",
                value: String(result.daysRemaining)
              },
              { key: "target", label: "Target day", value: String(result.targetDay) },
              {
                key: "window",
                label: "Window",
                value: `Day ${result.earliestDay}-${result.latestDay}`
              },
              {
                key: "warnings",
                label: "Warnings",
                value: String(result.warnings.length),
                detail: result.warnings[0] || "No warning from entered context"
              }
            ]}
            assumptions={[...result.evidence, ...result.warnings]}
            recommendations={[
              ...result.recommendations,
              "Use cultivar notes and plant health to override the estimate when needed."
            ]}
            actions={[
              {
                key: "save",
                label: "Save Estimate",
                pendingLabel: "Saving...",
                disabled: !growId,
                onPress: saveEstimate
              },
              {
                key: "create-task",
                label: "Create Harvest Check Task",
                variant: "secondary",
                pendingLabel: "Creating...",
                disabled: !growId,
                onPress: async () => {
                  if (!growId) throw new Error("Select a grow before creating a task.");
                  const taskResult = await saveToolRunAndCreateTask({
                    growId,
                    ...plantContext.toolRunContext,
                    toolKey: "harvest-estimator",
                    input,
                    output: result,
                    title: "Inspect harvest readiness",
                    description: [
                      result.summary,
                      `Window: day ${result.earliestDay}-${result.latestDay}.`,
                      ...result.warnings.map((warning) => `Warning: ${warning}`)
                    ].join("\n"),
                    priority: result.tasksToCreate[0]?.priority || "medium",
                    dueDate: dueInDays(result.tasksToCreate[0]?.dueInDays ?? 1)
                  });
                  if (!taskResult.ok) throw new Error(taskResult.error);
                  setFeedback("Created harvest check task.");
                }
              }
            ]}
            feedback={feedback}
            contextMessage={!growId ? "Select a grow to save this estimate." : undefined}
          />
        </>
      )}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_tools_harvest_estimator"
        longContent
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40, backgroundColor: "#FFFFFF", gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { color: "#64748B", lineHeight: 20 },
  context: { color: "#166534", fontWeight: "800" },
  label: { color: "#334155", fontWeight: "800", marginTop: 4 },
  input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 8, padding: 10 },
  pills: { gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  pillOn: { borderColor: "#166534", backgroundColor: "#DCFCE7" },
  pillText: { color: "#334155", fontWeight: "700", textTransform: "capitalize" },
  pillTextOn: { color: "#166534" }
});
