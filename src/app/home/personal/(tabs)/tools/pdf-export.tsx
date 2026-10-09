import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { type PersonalLog } from "@/api/logs";
import { type PersonalPlant } from "@/api/plants";
import { type PersonalTask } from "@/api/tasks";
import { listToolRuns, type ToolRun } from "@/api/toolRuns";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useAuth } from "@/auth/AuthContext";
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
  getWorkspaceGrow,
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

function exportScope(values: unknown[], generation: number) {
  return {
    generation,
    matches: (next: unknown[]) => values.every((value, index) => value === next[index])
  };
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
  const auth = useAuth();
  const enabled = entitlements.can(CAPABILITY_KEYS.TOOL_PDF_EXPORT);
  const identity = auth.user?.id || auth.user?._id;
  const values = [
    identity,
    auth.token,
    auth.isAuthed,
    auth.isHydrating,
    entitlements.ready,
    entitlements.mode,
    entitlements.plan,
    entitlements.facilityId,
    entitlements.facilityRole,
    auth.user?.role,
    enabled,
    workspaceType,
    growId
  ];
  const [scope, setScope] = useState(() => exportScope(values, 0));
  const currentScope = useRef<typeof scope | null>(scope);
  useLayoutEffect(() => {
    currentScope.current = scope;
    return () => {
      currentScope.current = null;
    };
  }, [scope]);
  const isCurrentScope = useCallback(() => currentScope.current === scope, [scope]);
  // Reset before committing another identity's data. Session values never enter a UI key.
  if (!scope.matches(values)) {
    setScope(exportScope(values, scope.generation + 1));
    return null;
  }

  return (
    <ScreenBoundary
      title="Grow Reports & Export"
      showBack
      preferBackFallback={
        workspaceType === "personal" &&
        Boolean(growId) &&
        presentation === "timeline" &&
        !backFallbackHref
      }
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

        <View key={scope.generation}>
          {auth.isHydrating ? (
            <Text style={styles.subtitle}>Checking export access…</Text>
          ) : !auth.isAuthed || !identity ? (
            <Text style={styles.subtitle}>Sign in to export your grow records.</Text>
          ) : !entitlements.ready ? (
            <ExportAccessRecovery
              failed={Boolean(entitlements.bootstrapError) || auth.meStatus === "error"}
              retry={auth.retryMe}
              isCurrentScope={isCurrentScope}
            />
          ) : !enabled ? (
            <LockedToolCard
              title="Grow Reports & Export"
              capability={CAPABILITY_KEYS.TOOL_PDF_EXPORT}
              description="Enable this capability to prepare grow records for export."
            />
          ) : entitlements.mode !== workspaceType ? (
            <Text style={styles.subtitle}>
              Switch to the {workspaceType === "commercial" ? "Commercial" : "Personal"}{" "}
              workspace to export these records.
            </Text>
          ) : (
            <>
              <PersonalFeedPlacement
                placement="middle"
                routeKey={`${workspaceType}_tools_pdf_export`}
                longContent
              />
              <ExportData
                growId={growId}
                workspaceType={workspaceType}
                isCurrentScope={isCurrentScope}
              />
            </>
          )}
        </View>

        <PersonalFeedPlacement
          placement="bottom"
          routeKey={`${workspaceType}_tools_pdf_export`}
          longContent
        />
      </ScrollView>
    </ScreenBoundary>
  );
}

function ExportAccessRecovery({
  failed,
  retry,
  isCurrentScope
}: {
  failed: boolean;
  retry: () => Promise<void>;
  isCurrentScope: () => boolean;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const pending = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  async function recover() {
    if (pending.current || !isCurrentScope()) return;
    pending.current = true;
    setRetrying(true);
    setRetryFailed(false);
    try {
      await retry();
    } catch {
      if (isCurrentScope()) setRetryFailed(true);
    } finally {
      pending.current = false;
      if (isCurrentScope()) setRetrying(false);
    }
  }
  return (
    <View style={styles.preview}>
      <Text style={styles.subtitle}>
        {failed || retryFailed
          ? "Unable to verify export access."
          : "Checking export access…"}
      </Text>
      {failed || retryFailed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry export access"
          accessibilityState={{ disabled: retrying }}
          disabled={retrying}
          onPress={recover}
          style={styles.retry}
        >
          <Text style={styles.context}>
            {retrying ? "Retrying…" : "Retry export access"}
          </Text>
        </Pressable>
      ) : (
        <ActivityIndicator color={palette.accent} />
      )}
    </View>
  );
}

function ExportData({
  growId,
  workspaceType,
  isCurrentScope
}: {
  growId: string;
  workspaceType: GrowWorkspace;
  isCurrentScope: () => boolean;
}) {
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const [logs, setLogs] = useState<PersonalLog[]>([]);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [plants, setPlants] = useState<PersonalPlant[]>([]);
  const [toolRuns, setToolRuns] = useState<ToolRun[]>([]);
  const [feedback, setFeedback] = useState("");
  const [timeline, setTimeline] = useState<PersonalGrowTimelineEvent[]>([]);
  const [growName, setGrowName] = useState("Grow");
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");
  const pending = useRef(false);
  const active = useRef(false);
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const current = useCallback(() => active.current && isCurrentScope(), [isCurrentScope]);
  const load = useCallback(async () => {
    if (pending.current || !current()) return;
    pending.current = true;
    setStatus("loading");
    setFeedback("");
    try {
      const strict = { throwOnError: true, verifyRecords: true };
      const growsPromise = listWorkspaceGrows(workspaceType, strict);
      const loadAcrossGrows = async <T,>(
        loader: (
          workspace: GrowWorkspace,
          growId: string,
          options: typeof strict
        ) => Promise<T[]>
      ) => {
        if (growId) return loader(workspaceType, growId, strict);
        const grows = await growsPromise;
        if (!current()) return [];
        return (
          await Promise.all(grows.map((grow) => loader(workspaceType, grow.id, strict)))
        ).flat();
      };
      const [nextLogs, nextTasks, nextPlants, nextToolRuns, nextTimeline, grows] =
        await Promise.all([
          loadAcrossGrows(listWorkspaceLogs),
          loadAcrossGrows(listWorkspaceTasks),
          loadAcrossGrows(listWorkspacePlants),
          listToolRuns({ ...(growId ? { growId } : {}), workspaceType }),
          growId
            ? getWorkspaceGrowTimeline(workspaceType, growId, strict)
            : Promise.resolve([]),
          growsPromise
        ]);
      if (!current()) return;
      let selectedGrow = grows.find((grow) => grow.id === growId);
      if (growId && !selectedGrow && workspaceType === "personal") {
        const archivedGrows = await listWorkspaceGrows("personal", {
          ...strict,
          archived: true
        });
        if (!current()) return;
        selectedGrow = archivedGrows.find((grow) => grow.id === growId);
      } else if (growId && !selectedGrow && workspaceType === "commercial") {
        const exactGrow = await getWorkspaceGrow("commercial", growId, {
          verifyRecords: true
        });
        if (!current()) return;
        selectedGrow = exactGrow?.id === growId ? exactGrow : undefined;
      }
      if (growId && !selectedGrow) throw new Error("Selected grow unavailable");
      setLogs(nextLogs);
      setTasks(nextTasks);
      setPlants(nextPlants);
      setToolRuns(nextToolRuns);
      setTimeline(nextTimeline);
      setGrowName(selectedGrow?.name || "Grow");
      setStatus("ready");
    } catch {
      if (current()) setStatus("error");
    } finally {
      pending.current = false;
    }
  }, [current, growId, workspaceType]);
  useEffect(() => {
    void load();
  }, [load]);
  const rows = useMemo(
    () => buildExportRows({ logs, tasks, plants, toolRuns }),
    [logs, tasks, plants, toolRuns]
  );

  async function exportCsv() {
    if (!current() || status !== "ready" || !rows.length) return;
    const result = await exportToCsv("growpath-export", rows, [
      { key: "type", label: "Type" },
      { key: "date", label: "Date" },
      { key: "title", label: "Title" },
      { key: "detail", label: "Detail" }
    ]);
    if (current())
      setFeedback(
        result.method === "web-download"
          ? "CSV download prepared."
          : "CSV share sheet opened."
      );
  }
  async function exportVisualTimeline() {
    if (!current() || status !== "ready" || !timeline.length) return;
    const method = await downloadVisualTimeline(
      `${growName} — Visual Grow Timeline`,
      timeline
    );
    // A delivery already handed to the existing exporter is not cancellable here.
    if (current())
      setFeedback(
        method === "web-download"
          ? "Viewer-friendly timeline download prepared."
          : "Timeline share sheet opened."
      );
  }
  if (status !== "ready")
    return (
      <View style={styles.preview}>
        <Text style={styles.subtitle}>
          {status === "loading" ? "Loading export data…" : "Unable to load export data."}
        </Text>
        {status === "loading" ? (
          <ActivityIndicator color={palette.accent} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry export data"
            onPress={load}
            style={styles.retry}
          >
            <Text style={styles.context}>Retry export data</Text>
          </Pressable>
        )}
      </View>
    );
  return (
    <ToolResultSurface
      title="Export package"
      status={rows.length || timeline.length ? "READY" : "EMPTY"}
      summary={
        rows.length || timeline.length
          ? "CSV export is available now with browser download and native share support."
          : "No records are available to export."
      }
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
              <View key={`${row.type}-${row.date}-${index}`} style={styles.previewRow}>
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
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { padding: 20, paddingBottom: 40, backgroundColor: palette.page, gap: 8 },
    title: { fontSize: 22, fontWeight: "800", color: palette.text },
    subtitle: { color: palette.textMuted, lineHeight: 20 },
    context: { color: palette.accent, fontWeight: "800" },
    retry: {
      alignSelf: "flex-start",
      padding: 12,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card
    },
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
