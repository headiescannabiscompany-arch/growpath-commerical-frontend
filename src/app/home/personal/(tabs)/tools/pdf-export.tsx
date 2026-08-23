import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { type PersonalLog } from "@/api/logs";
import { type PersonalPlant } from "@/api/plants";
import { type PersonalTask } from "@/api/tasks";
import { listToolRuns, type ToolRun } from "@/api/toolRuns";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { buildExportRows } from "@/features/personal/tools/advancedPlanning";
import LockedToolCard from "@/features/personal/tools/LockedToolCard";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import { exportToCsv } from "@/utils/exportToCsv";
import { type PersonalGrowTimelineEvent } from "@/api/grows";
import {
  exportVisualTimeline as downloadVisualTimeline,
  timelineSummaryForExport
} from "@/utils/exportVisualTimeline";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  getWorkspaceGrowTimeline,
  listWorkspaceGrows,
  listWorkspaceLogs,
  listWorkspacePlants,
  listWorkspaceTasks,
  type GrowWorkspace
} from "@/features/grows/workspaceData";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

export default function PdfExportScreen({
  backFallbackHref,
  workspaceType = "personal"
}: {
  backFallbackHref?: string;
  workspaceType?: GrowWorkspace;
} = {}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const { growId: rawGrowId, presentation: rawPresentation } = useLocalSearchParams<{
    growId?: string | string[];
    presentation?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const presentation = useMemo(() => coerceParam(rawPresentation), [rawPresentation]);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_PDF_EXPORT);
  const [logs, setLogs] = useState<PersonalLog[]>([]);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [plants, setPlants] = useState<PersonalPlant[]>([]);
  const [toolRuns, setToolRuns] = useState<ToolRun[]>([]);
  const [feedback, setFeedback] = useState("");
  const [timeline, setTimeline] = useState<PersonalGrowTimelineEvent[]>([]);
  const [growName, setGrowName] = useState("Grow");

  useEffect(() => {
    if (!enabled) return;
    const loadAcrossGrows = async <T,>(
      loader: (workspace: GrowWorkspace, growId: string) => Promise<T[]>
    ) => {
      if (growId) return loader(workspaceType, growId);
      const grows = await listWorkspaceGrows(workspaceType);
      const rows = await Promise.all(
        grows.map((grow: any) => loader(workspaceType, String(grow.id || grow._id || "")))
      );
      return rows.flat();
    };
    Promise.all([
      loadAcrossGrows(listWorkspaceLogs),
      loadAcrossGrows(listWorkspaceTasks),
      loadAcrossGrows(listWorkspacePlants),
      listToolRuns({
        ...(growId ? { growId } : {}),
        workspaceType
      }),
      growId ? getWorkspaceGrowTimeline(workspaceType, growId) : Promise.resolve([]),
      growId ? listWorkspaceGrows(workspaceType) : Promise.resolve([])
    ])
      .then(([nextLogs, nextTasks, nextPlants, nextToolRuns, nextTimeline, grows]) => {
        setLogs(nextLogs);
        setTasks(nextTasks);
        setPlants(nextPlants);
        setToolRuns(nextToolRuns);
        setTimeline(nextTimeline);
        const selectedGrow = grows.find(
          (grow: any) => String(grow.id || grow._id) === growId
        );
        setGrowName(selectedGrow?.name || "Grow");
      })
      .catch(() => setFeedback("Unable to load export data."));
  }, [enabled, growId, workspaceType]);

  const rows = useMemo(
    () => buildExportRows({ logs, tasks, plants, toolRuns }),
    [logs, plants, tasks, toolRuns]
  );

  async function exportCsv() {
    if (!rows.length) {
      setFeedback("No rows are available to export.");
      return;
    }
    const result = await exportToCsv("growpath-export", rows, [
      { key: "type", label: "Type" },
      { key: "date", label: "Date" },
      { key: "title", label: "Title" },
      { key: "detail", label: "Detail" }
    ]);
    setFeedback(
      result.method === "web-download"
        ? "CSV download prepared."
        : "CSV share sheet opened."
    );
  }

  async function exportVisualTimeline() {
    if (!timeline.length) {
      setFeedback("No timeline events are available to export.");
      return;
    }
    const method = await downloadVisualTimeline(
      `${growName} — Visual Grow Timeline`,
      timeline
    );
    setFeedback(
      method === "web-download"
        ? "Viewer-friendly timeline download prepared."
        : "Timeline share sheet opened."
    );
  }

  return (
    <ScreenBoundary
      title="Grow Reports & Export"
      showBack
      backFallbackHref={
        backFallbackHref ||
        (growId
          ? `${workspaceType === "commercial" ? "/home/commercial" : "/home/personal"}/grows/${encodeURIComponent(growId)}/timeline`
          : workspaceType === "commercial"
            ? "/home/commercial/profile"
            : "/home/personal/profile")
      }
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Grow Reports & Export</Text>
        <Text style={styles.subtitle}>
          {presentation === "timeline"
            ? "Export a viewer-friendly grow story with dated notes and saved photo evidence. This is separate from compliance reporting."
            : "Gather grow logs, tasks, plants, and tool runs into an export-ready dataset. CSV is available now; PDF reports stay attached to the grow records they summarize."}
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey={`${workspaceType}_tools_pdf_export`}
          longContent
        />
        {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

        {!enabled ? (
          <LockedToolCard
            title="Grow Reports & Export"
            capability={CAPABILITY_KEYS.TOOL_PDF_EXPORT}
            description="Enable this capability to prepare grow records for export."
          />
        ) : (
          <>
            <PersonalFeedPlacement
              placement="middle"
              routeKey={`${workspaceType}_tools_pdf_export`}
              longContent
            />
            <ToolResultSurface
              title="Export package"
              status="READY"
              summary="CSV export is available now with browser download and native share support."
              metrics={[
                { key: "logs", label: "Logs", value: String(logs.length) },
                { key: "tasks", label: "Tasks", value: String(tasks.length) },
                { key: "plants", label: "Plants", value: String(plants.length) },
                { key: "runs", label: "Tool runs", value: String(toolRuns.length) }
              ]}
              details={
                rows.length ? (
                  <View style={styles.preview}>
                    {rows.slice(0, 8).map((row, index) => (
                      <View
                        key={`${row.type}-${row.date}-${index}`}
                        style={styles.previewRow}
                      >
                        <Text style={styles.previewTitle}>
                          {row.date || "No date"} | {row.type} | {row.title}
                        </Text>
                        <Text style={styles.previewDetail} numberOfLines={2}>
                          {timelineSummaryForExport(row.detail) || "No detail"}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : undefined
              }
              assumptions={[
                "This export uses records visible to the current account and optional grow context.",
                "Use CSV export for the current release; PDF output is not exposed as a completed workflow."
              ]}
              actions={[
                ...(growId && timeline.length
                  ? [
                      {
                        key: "visual-timeline",
                        label: "Export Visual Timeline",
                        pendingLabel: "Preparing...",
                        onPress: exportVisualTimeline
                      }
                    ]
                  : []),
                {
                  key: "csv",
                  label: "Export CSV",
                  pendingLabel: "Preparing...",
                  disabled: !rows.length,
                  onPress: exportCsv
                }
              ]}
              feedback={feedback}
            />
          </>
        )}

        <PersonalFeedPlacement
          placement="bottom"
          routeKey={`${workspaceType}_tools_pdf_export`}
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
    preview: { gap: 8 },
    previewRow: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.surface
    },
    previewTitle: { color: palette.text, fontWeight: "800" },
    previewDetail: { color: palette.textMuted, marginTop: 3, lineHeight: 18 }
  });
