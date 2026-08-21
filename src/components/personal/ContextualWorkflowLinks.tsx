import React, { useMemo } from "react";
import * as ExpoRouter from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import type { GrowWorkspace } from "@/features/grows/workspaceData";

export type ContextualWorkflowKey =
  | "auto-grow-calendar"
  | "watering"
  | "feeding-schedule"
  | "topdress"
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
  topdress: {
    label: "Topdress Planner",
    description: "Plan application, water-in, response, and recheck tasks.",
    path: "/home/personal/tools/topdress"
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
  workspace?: GrowWorkspace;
  growId?: string;
  plantId?: string;
  logId?: string;
  initialValues?: Record<string, string | number | boolean | null | undefined>;
};

const useContextualRouter =
  typeof ExpoRouter.useRouter === "function"
    ? ExpoRouter.useRouter
    : () => ({ push: ExpoRouter.router?.push });

export function contextualWorkflowHref(
  workflow: ContextualWorkflowKey,
  context: Omit<Props, "title" | "helper" | "workflows">
) {
  const definition = WORKFLOWS[workflow];
  const workspace = context.workspace || "personal";
  const query = new URLSearchParams({ source: context.source });
  if (context.growId) query.set("growId", context.growId);
  if (context.plantId) query.set("plantId", context.plantId);
  if (context.logId) query.set("logId", context.logId);
  Object.entries(context.initialValues || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      query.set(key, String(value));
    }
  });
  if (workspace === "commercial") {
    const directPaths: Partial<Record<ContextualWorkflowKey, string>> = {
      "auto-grow-calendar": "/home/commercial/tools/auto-grow-calendar",
      "harvest-readiness": "/home/commercial/tools/harvest-readiness",
      "pdf-export": "/home/commercial/tools/report"
    };
    const path = directPaths[workflow] || "/home/commercial/tools";
    if (!directPaths[workflow]) query.set("recommendedTool", workflow);
    return `${path}?${query.toString()}`;
  }
  return `${definition.path}?${query.toString()}`;
}

export default function ContextualWorkflowLinks({
  title,
  helper,
  workflows,
  ...context
}: Props) {
  const router = useContextualRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" aria-level={3} style={styles.title}>
        {title}
      </Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <View style={styles.row}>
        {workflows.map((workflow) => {
          const definition = WORKFLOWS[workflow];
          return (
            <Pressable
              key={workflow}
              accessibilityRole="link"
              accessibilityLabel={`${definition.label} from ${context.source}`}
              accessibilityHint={definition.description}
              onPress={() =>
                router.push?.(contextualWorkflowHref(workflow, context) as any)
              }
              style={StyleSheet.flatten(styles.action)}
            >
              <Text style={styles.actionTitle}>{definition.label}</Text>
              <Text style={styles.actionDescription}>{definition.description}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      marginTop: 12,
      padding: 12
    },
    title: { color: palette.text, fontSize: 16, fontWeight: "900" },
    helper: { color: palette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
    row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    action: {
      justifyContent: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      minWidth: 180,
      paddingHorizontal: 11,
      paddingVertical: 9
    },
    actionTitle: { color: palette.link, fontSize: 13, fontWeight: "900" },
    actionDescription: {
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3
    }
  });
