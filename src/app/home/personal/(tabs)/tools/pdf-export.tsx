import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { listPersonalLogs, type PersonalLog } from "@/api/logs";
import { listPersonalPlants, type PersonalPlant } from "@/api/plants";
import { listPersonalTasks, type PersonalTask } from "@/api/tasks";
import { listToolRuns, type ToolRun } from "@/api/toolRuns";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { buildExportRows } from "@/features/personal/tools/advancedPlanning";
import LockedToolCard from "@/features/personal/tools/LockedToolCard";
import ToolResultSurface from "@/features/personal/tools/ToolResultSurface";
import { exportToCsv } from "@/utils/exportToCsv";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { radius } from "@/theme/theme";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

export default function PdfExportScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const entitlements = useEntitlements();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_PDF_EXPORT);
  const [logs, setLogs] = useState<PersonalLog[]>([]);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [plants, setPlants] = useState<PersonalPlant[]>([]);
  const [toolRuns, setToolRuns] = useState<ToolRun[]>([]);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!enabled) return;
    Promise.all([
      listPersonalLogs(growId ? { growId } : undefined),
      listPersonalTasks(growId ? { growId } : undefined),
      listPersonalPlants(growId ? { growId } : undefined),
      listToolRuns(growId ? { growId } : undefined)
    ])
      .then(([nextLogs, nextTasks, nextPlants, nextToolRuns]) => {
        setLogs(nextLogs);
        setTasks(nextTasks);
        setPlants(nextPlants);
        setToolRuns(nextToolRuns);
      })
      .catch(() => setFeedback("Unable to load export data."));
  }, [enabled, growId]);

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

  return (
    <ScreenBoundary title="PDF / Export" showBack backFallbackHref="/home/personal/tools">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>PDF / Export</Text>
        <Text style={styles.subtitle}>
          Gather grow logs, tasks, plants, and tool runs into an export-ready dataset. CSV
          is available now; PDF reports stay attached to the grow records they summarize.
        </Text>
        <PersonalFeedPlacement
          placement="top"
          routeKey="personal_tools_pdf_export"
          longContent
        />
        {growId ? <Text style={styles.context}>Grow context: {growId}</Text> : null}

        {!enabled ? (
          <LockedToolCard
            title="PDF / Export"
            capability={CAPABILITY_KEYS.TOOL_PDF_EXPORT}
            description="Enable this capability to prepare grow records for export."
          />
        ) : (
          <>
            <PersonalFeedPlacement
              placement="middle"
              routeKey="personal_tools_pdf_export"
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
                          {row.detail || "No detail"}
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
          routeKey="personal_tools_pdf_export"
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
  preview: { gap: 8 },
  previewRow: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 10,
    backgroundColor: "#FFFFFF"
  },
  previewTitle: { color: "#0F172A", fontWeight: "800" },
  previewDetail: { color: "#64748B", marginTop: 3, lineHeight: 18 }
});
