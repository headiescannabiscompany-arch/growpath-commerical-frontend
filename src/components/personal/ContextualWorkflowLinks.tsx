import React from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius } from "@/theme/theme";

export type ContextualWorkflowKey =
  | "auto-grow-calendar"
  | "watering"
  | "feeding-schedule"
  | "timeline-planner"
  | "pheno-matrix"
  | "harvest-readiness"
  | "pdf-export";

const WORKFLOWS: Record<
  ContextualWorkflowKey,
  { label: string; description: string; path: string }
> = {
  "auto-grow-calendar": {
    label: "Grow Planner / Auto Calendar",
    description: "Build stage dates and create starter tasks.",
    path: "/home/personal/tools/auto-grow-calendar"
  },
  watering: {
    label: "Watering Planner",
    description: "Estimate watering and create dryback checks.",
    path: "/home/personal/tools/watering"
  },
  "feeding-schedule": {
    label: "Feeding Schedule",
    description: "Turn a feed plan into scheduled tasks.",
    path: "/home/personal/tools/feeding-schedule"
  },
  "timeline-planner": {
    label: "Timeline Planner",
    description: "Create stage-based tasks and reminders.",
    path: "/home/personal/tools/timeline-planner"
  },
  "pheno-matrix": {
    label: "Pheno Matrix",
    description: "Score and compare plants inside this grow.",
    path: "/home/personal/tools/pheno-matrix"
  },
  "harvest-readiness": {
    label: "Harvest Readiness",
    description: "Review maturity signals and create recheck tasks.",
    path: "/home/personal/tools/harvest-readiness"
  },
  "pdf-export": {
    label: "Export Grow Report",
    description: "Export the grow's logs, timeline, tasks, and ToolRuns.",
    path: "/home/personal/tools/pdf-export"
  }
};

type Props = {
  title: string;
  helper?: string;
  workflows: ContextualWorkflowKey[];
  source: string;
  growId?: string;
  plantId?: string;
  logId?: string;
  initialValues?: Record<string, string | number | boolean | null | undefined>;
};

export function contextualWorkflowHref(
  workflow: ContextualWorkflowKey,
  context: Omit<Props, "title" | "helper" | "workflows">
) {
  const definition = WORKFLOWS[workflow];
  const query = new URLSearchParams({ source: context.source });
  if (context.growId) query.set("growId", context.growId);
  if (context.plantId) query.set("plantId", context.plantId);
  if (context.logId) query.set("logId", context.logId);
  Object.entries(context.initialValues || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value));
    }
  });
  return `${definition.path}?${query.toString()}`;
}

export default function ContextualWorkflowLinks({
  title,
  helper,
  workflows,
  ...context
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <View style={styles.row}>
        {workflows.map((workflow) => {
          const definition = WORKFLOWS[workflow];
          return (
            <Link
              key={workflow}
              href={contextualWorkflowHref(workflow, context) as any}
              asChild
            >
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${definition.label} from ${context.source}`}
                style={styles.action}
              >
                <Text style={styles.actionTitle}>{definition.label}</Text>
                <Text style={styles.actionDescription}>{definition.description}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
    padding: 12
  },
  title: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  helper: { color: "#64748B", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 180,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  actionTitle: { color: "#166534", fontSize: 13, fontWeight: "900" },
  actionDescription: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3
  }
});
