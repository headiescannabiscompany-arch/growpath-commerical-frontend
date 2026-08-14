import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Platform, ScrollView, Share, StyleSheet, Text, View } from "react-native";

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
import {
  getPersonalGrowTimeline,
  listPersonalGrows,
  type PersonalGrowTimelineEvent
} from "@/api/grows";
import { timelineEventPhotos } from "@/features/grows/timeline";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

export default function PdfExportScreen({
  backFallbackHref
}: {
  backFallbackHref?: string;
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
    Promise.all([
      listPersonalLogs(growId ? { growId } : undefined),
      listPersonalTasks(growId ? { growId } : undefined),
      listPersonalPlants(growId ? { growId } : undefined),
      listToolRuns(growId ? { growId } : undefined),
      growId ? getPersonalGrowTimeline(growId) : Promise.resolve([]),
      growId ? listPersonalGrows() : Promise.resolve([])
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

  async function exportVisualTimeline() {
    if (!timeline.length) {
      setFeedback("No timeline events are available to export.");
      return;
    }
    const plainText = [
      `${growName} — Visual Grow Timeline`,
      "",
      ...timeline.map(
        (event) =>
          `${new Date(event.timestamp).toLocaleDateString()} — ${event.title}${event.summary ? `\n${event.summary}` : ""}`
      )
    ].join("\n\n");
    if (Platform.OS !== "web" || typeof document === "undefined") {
      await Share.share({
        title: `${growName} — Visual Grow Timeline`,
        message: plainText
      });
      setFeedback("Timeline share sheet opened.");
      return;
    }
    const escape = (value: unknown) =>
      String(value || "").replace(
        /[&<>"]/g,
        (character) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ||
          character
      );
    const eventHtml = timeline
      .map((event) => {
        const photos = timelineEventPhotos(event as any)
          .map(
            (photo) =>
              `<img src="${escape(photo)}" alt="Timeline evidence for ${escape(event.title)}" />`
          )
          .join("");
        return `<article><time>${escape(new Date(event.timestamp).toLocaleString())}</time><h2>${escape(event.title)}</h2>${event.summary ? `<p>${escape(event.summary)}</p>` : ""}<div class="photos">${photos}</div></article>`;
      })
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(growName)} — Visual Grow Timeline</title><style>body{font-family:system-ui,sans-serif;max-width:900px;margin:auto;padding:32px;color:#17231b}header,article{border:1px solid #ccd8cf;border-radius:14px;padding:18px;margin:0 0 18px}time{color:#607064;font-size:14px}h1,h2{margin:6px 0}.photos{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.photos img{width:220px;max-height:180px;object-fit:cover;border-radius:10px}@media print{body{padding:0}article{break-inside:avoid}}</style></head><body><header><h1>${escape(growName)} — Visual Grow Timeline</h1><p>Viewer-friendly saved grow history. This is not a compliance report.</p></header>${eventHtml}</body></html>`;
    const url = URL.createObjectURL(
      new Blob([html], { type: "text/html;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${
      growName
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "grow"
    }-visual-timeline.html`;
    anchor.click();
    URL.revokeObjectURL(url);
    setFeedback("Viewer-friendly timeline download prepared.");
  }

  return (
    <ScreenBoundary
      title="Grow Reports & Export"
      showBack
      backFallbackHref={
        backFallbackHref ||
        (growId
          ? `/home/personal/grows/${encodeURIComponent(growId)}/timeline`
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
          routeKey="personal_tools_pdf_export"
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
          routeKey="personal_tools_pdf_export"
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
