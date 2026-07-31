import React, { useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import CalendarDateField from "@/components/forms/CalendarDateField";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { buildTimelinePlan } from "@/features/personal/tools/advancedPlanning";
import LockedToolCard from "@/features/personal/tools/LockedToolCard";
import {
  ToolPlantContextPicker,
  useToolPlantContext
} from "@/features/personal/tools/ToolPlantContextPicker";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import { saveToolRunAndCreateTasks } from "@/features/personal/tools/saveToolRunAndOpenJournal";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function timelineCalendarMetadata(sourceStage: string) {
  return {
    allDay: true,
    calendarType: "timeline_planner",
    sourceStage,
    reminderPlan: {
      label: "24 hours before",
      channels: ["in_app"],
      reminders: [{ offsetMinutes: -1440 }]
    }
  };
}

export default function TimelinePlannerScreen() {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const { growId: rawGrowId, plantId: rawPlantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const initialPlantId = useMemo(() => coerceParam(rawPlantId), [rawPlantId]);
  const plantContext = useToolPlantContext(growId, initialPlantId);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_TIMELINE_PLANNER);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [vegWeeks, setVegWeeks] = useState("4");
  const [flowerWeeks, setFlowerWeeks] = useState("9");
  const [dryDays, setDryDays] = useState("10");
  const [cureWeeks, setCureWeeks] = useState("4");
  const [feedback, setFeedback] = useState("");

  const milestones = useMemo(
    () =>
      buildTimelinePlan({
        startDate,
        vegWeeks: numberValue(vegWeeks, 4),
        flowerWeeks: numberValue(flowerWeeks, 9),
        dryDays: numberValue(dryDays, 10),
        cureWeeks: numberValue(cureWeeks, 4)
      }),
    [cureWeeks, dryDays, flowerWeeks, startDate, vegWeeks]
  );

  async function createTasks() {
    if (!growId) throw new Error("Select a grow before creating tasks.");
    const result = await saveToolRunAndCreateTasks({
      growId,
      ...plantContext.toolRunContext,
      toolKey: "timeline-planner",
      input: {
        startDate,
        vegWeeks: numberValue(vegWeeks, 4),
        flowerWeeks: numberValue(flowerWeeks, 9),
        dryDays: numberValue(dryDays, 10),
        cureWeeks: numberValue(cureWeeks, 4)
      },
      output: {
        milestones,
        milestoneCount: milestones.length,
        harvestWindow:
          milestones.find((item) => item.key === "harvest-window")?.date || null
      },
      tasks: milestones.slice(1).map((milestone) => ({
        title: milestone.label,
        description: [
          milestone.detail,
          plantContext.selectedPlantContext
            ? `Plant context: ${plantContext.selectedPlantContext.name || plantContext.selectedPlantContext.cropCommonName || "selected plant"}`
            : "",
          plantContext.selectedPlantContext?.scientificName
            ? `Species: ${plantContext.selectedPlantContext.scientificName}`
            : ""
        ]
          .filter(Boolean)
          .join("\n"),
        dueDate: milestone.date,
        priority: "medium",
        ...timelineCalendarMetadata(milestone.key)
      }))
    });
    if (!result.ok) throw new Error(result.error);
    setFeedback(`Timeline tasks created and linked to ToolRun ${result.toolRunId}.`);
  }

  return (
    <ScreenBoundary
      title="Timeline Planner"
      showBack
      backFallbackHref="/home/personal/tools"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Timeline Planner</Text>
        <Text style={styles.subtitle}>
          Build a date-based grow plan across veg, flower, dry, and cure milestones.
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_timeline_planner"
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
            title="Timeline Planner"
            capability={CAPABILITY_KEYS.TOOL_TIMELINE_PLANNER}
            description="Enable this capability to plan grow milestones and create follow-up tasks."
          />
        ) : (
          <>
            <CalendarDateField
              accessibilityLabel="Timeline start date"
              label="Start date"
              placeholder="Choose timeline start date"
              value={startDate}
              onChange={setStartDate}
              optional={false}
            />
            <Text style={styles.label}>Veg weeks</Text>
            <TextInput
              accessibilityLabel="Timeline veg weeks"
              style={styles.input}
              value={vegWeeks}
              onChangeText={setVegWeeks}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Flower weeks</Text>
            <TextInput
              accessibilityLabel="Timeline flower weeks"
              style={styles.input}
              value={flowerWeeks}
              onChangeText={setFlowerWeeks}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Dry days</Text>
            <TextInput
              accessibilityLabel="Timeline dry days"
              style={styles.input}
              value={dryDays}
              onChangeText={setDryDays}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Cure weeks</Text>
            <TextInput
              accessibilityLabel="Timeline cure weeks"
              style={styles.input}
              value={cureWeeks}
              onChangeText={setCureWeeks}
              keyboardType="numeric"
            />

            <PersonalFeedPlacement
              placement="middle"
              routeKey="personal_tools_timeline_planner"
              longContent
            />

            <ToolResultSurface
              title="Planned timeline"
              status="LOCAL PLAN"
              summary="Milestones are deterministic from the date and duration inputs."
              metrics={[
                { key: "start", label: "Start", value: milestones[0]?.date || startDate },
                {
                  key: "harvest",
                  label: "Harvest window",
                  value:
                    milestones.find((item) => item.key === "harvest-window")?.date || ""
                },
                { key: "count", label: "Milestones", value: String(milestones.length) }
              ]}
              details={
                <View style={styles.milestones}>
                  {milestones.map((milestone) => (
                    <View key={milestone.key} style={styles.milestone}>
                      <Text style={styles.milestoneDate}>{milestone.date}</Text>
                      <Text style={styles.milestoneTitle}>{milestone.label}</Text>
                      <Text style={styles.milestoneDetail}>{milestone.detail}</Text>
                    </View>
                  ))}
                </View>
              }
              actions={[
                {
                  key: "tasks",
                  label: "Create Tasks",
                  pendingLabel: "Creating...",
                  disabled: !growId,
                  onPress: createTasks
                }
              ]}
              feedback={feedback}
              contextMessage={
                !growId ? "Select a grow to create timeline tasks." : undefined
              }
            />
          </>
        )}

        <PersonalFeedPlacement
          placement="bottom"
          routeKey="personal_tools_timeline_planner"
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: palette.page, gap: 8 },
    title: { fontSize: 22, fontWeight: "800", color: palette.text },
    subtitle: { color: palette.textMuted, lineHeight: 20 },
    context: { color: palette.accent, fontWeight: "800" },
    label: { color: palette.text, fontWeight: "800", marginTop: 4 },
    input: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      color: palette.text,
      padding: 10
    },
    milestones: { gap: 8 },
    milestone: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.surface
    },
    milestoneDate: { color: palette.accent, fontWeight: "800" },
    milestoneTitle: { color: palette.text, fontWeight: "800", marginTop: 3 },
    milestoneDetail: { color: palette.textMuted, marginTop: 2, lineHeight: 18 }
  });
