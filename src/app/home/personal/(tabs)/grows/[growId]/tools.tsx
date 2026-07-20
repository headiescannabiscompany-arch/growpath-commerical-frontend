import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  createTaskFromToolRun,
  getToolRun,
  listToolRuns,
  saveToolRunToLog,
  type ToolRun
} from "@/api/toolRuns";
import { listPersonalGrows } from "@/api/grows";
import GrowWorkspaceNav from "@/components/personal/GrowWorkspaceNav";
import { coerceParam, findGrowById, isCannabisGrow } from "@/features/grows/routeUtils";
import { radius } from "@/theme/theme";
import ToolResultSurface, {
  type ToolResultAction,
  type ToolResultMetric,
  type ToolResultNotice
} from "@/features/personal/tools/ToolResultSurface";
import PersonalFeedPlacement from "@/components/feed/PersonalFeedPlacement";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, gap: 10 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  subtitle: { color: "#64748B", marginBottom: 12 },
  card: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC",
    padding: 12,
    marginTop: 10
  },
  cardTitle: { fontWeight: "700" },
  cardText: { color: "#475569", marginTop: 4 },
  action: {
    marginTop: 10,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 10
  },
  actionText: { fontWeight: "700", color: "#0F172A" },
  inlineAction: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    paddingVertical: 7,
    paddingHorizontal: 10
  },
  recentTitle: { marginTop: 12, fontWeight: "700", color: "#0F172A" },
  recentRow: { marginTop: 6, fontSize: 12, color: "#475569" },
  recentContext: { marginTop: 2, fontSize: 12, color: "#166534", fontWeight: "700" }
});

function withGrow(path: string, growId: string) {
  return `${path}?growId=${encodeURIComponent(growId)}`;
}

type GrowWorkspaceItem = readonly [
  label: string,
  path: string,
  options?: { cannabisOnly?: boolean }
];

type GrowWorkspaceGroup = {
  title: string;
  items: readonly GrowWorkspaceItem[];
};

const GROW_WORKSPACE_GROUPS = [
  {
    title: "Plan & schedule",
    items: [
      ["Grow lifecycle plan", "/home/personal/tools/auto-grow-calendar"],
      ["Tasks", "tasks"]
    ]
  },
  {
    title: "Water, feed & environment",
    items: [
      ["Watering plan", "/home/personal/tools/watering"],
      ["Feeding schedule", "/home/personal/tools/feeding-schedule"],
      ["Feed / topdress recipes", "/home/personal/tools/recipe-builder"],
      ["Environment review", "/home/personal/tools/environment-analysis"],
      ["pH / EC", "/home/personal/tools/ph-ec"],
      ["Crop steering", "/home/personal/tools/crop-steering-project"],
      ["Stress / recovery", "/home/personal/tools/stress-test"]
    ]
  },
  {
    title: "Plant health & propagation",
    items: [
      ["Ask AI", "/home/personal/ai"],
      ["Plant Diagnose", "/home/personal/diagnose"],
      ["IPM Scout", "/home/personal/tools/ipm-scout"],
      ["Clone rooting", "/home/personal/tools/clone-rooting"]
    ]
  },
  {
    title: "Genetics & selection",
    items: [
      ["Genetics records", "/home/personal/tools/genetics-inventory"],
      ["Pheno hunt", "/home/personal/tools/pheno-hunt"],
      ["Pheno matrix", "/home/personal/tools/pheno-matrix"],
      ["Tissue culture", "/home/personal/tools/tissue-culture"]
    ]
  },
  {
    title: "Harvest & post-harvest",
    items: [
      [
        "Harvest readiness calculator",
        "/home/personal/tools/harvest-readiness",
        { cannabisOnly: true }
      ],
      ["Dry / cure", "/home/personal/tools/dry-cure-guard", { cannabisOnly: true }],
      ["Compare runs", "compare"]
    ]
  }
] as const satisfies readonly GrowWorkspaceGroup[];

function toolRunContextLabel(run: any) {
  const context = run?.selectedPlantContext || run?.cropIdentity || {};
  const parts = [
    context?.name || (run?.plantId ? `Plant ${run.plantId}` : ""),
    context?.cropCommonName || context?.scientificName || "",
    context?.cultivarOrStrain || ""
  ].filter(Boolean);
  return parts.length ? parts.join(" | ") : "Whole grow";
}

function labelize(value: string) {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

function formatValue(value: any) {
  if (value == null || value === "") return "-";
  if (typeof value === "number")
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") return "{...}";
  return String(value);
}

function toolRunMetrics(run: ToolRun | null): ToolResultMetric[] {
  const outputs = run?.outputs || run?.result || {};
  const entries = Object.entries(outputs)
    .filter(([, value]) => value != null && typeof value !== "object")
    .slice(0, 4);
  return entries.length
    ? entries.map(([key, value]) => ({
        key,
        label: labelize(key),
        value: formatValue(value)
      }))
    : [{ key: "status", label: "Status", value: run?.status || "completed" }];
}

function toolRunNotices(run: ToolRun | null): ToolResultNotice[] {
  return (run?.warnings || []).map((message, index) => ({
    key: `warning-${index}`,
    severity: "medium",
    message
  }));
}

export default function GrowToolsScreen() {
  const { growId: rawGrowId } = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const [recent, setRecent] = useState<ToolRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<ToolRun | null>(null);
  const [loadingRunId, setLoadingRunId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [cannabisGrow, setCannabisGrow] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      (async () => {
        const [rows, grows] = await Promise.all([
          listToolRuns({ growId }),
          listPersonalGrows()
        ]);
        if (!mounted) return;
        setRecent(Array.isArray(rows) ? rows.slice(0, 4) : []);
        setCannabisGrow(isCannabisGrow(findGrowById(grows, growId), rows));
      })();
      return () => {
        mounted = false;
      };
    }, [growId])
  );

  const selectedRunId = String(selectedRun?._id || selectedRun?.id || "");
  const selectedActions: ToolResultAction[] = selectedRunId
    ? [
        {
          key: "save-log",
          label: "Save to Grow Log",
          pendingLabel: "Saving...",
          successMessage: "Saved to grow log.",
          onPress: async () => {
            await saveToolRunToLog(selectedRunId);
          }
        },
        {
          key: "create-task",
          label: "Create Task",
          variant: "secondary",
          pendingLabel: "Creating...",
          successMessage: "Task created.",
          onPress: async () => {
            await createTaskFromToolRun(selectedRunId);
          }
        }
      ]
    : [];

  async function viewRun(run: ToolRun) {
    const id = String(run?._id || run?.id || "");
    if (!id) return;
    setLoadingRunId(id);
    setFeedback("");
    const fullRun = await getToolRun(id);
    setSelectedRun(fullRun || run);
    setFeedback(fullRun ? "" : "Unable to reload this run; showing cached list data.");
    setLoadingRunId("");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Grow Intelligence</Text>
      <Text style={styles.subtitle}>
        Plan and operate this grow with its plants, history, evidence, tasks, and saved
        results already attached.
      </Text>
      <PersonalFeedPlacement
        placement="top"
        routeKey="personal_grows_growid_tools"
        longContent
      />
      <GrowWorkspaceNav growId={growId} active="tools" />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reusable calculator library</Text>
        <Text style={styles.cardText}>
          Open the general library for reusable VPD, PPFD/DLI, dew point, pH/EC, and
          recipe calculations.
        </Text>
        <Link href={withGrow("/home/personal/tools", growId)} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Open calculator library</Text>
          </Pressable>
        </Link>
        <Link href={withGrow("/home/personal/tools/saved-runs", growId)} asChild>
          <Pressable style={styles.action}>
            <Text style={styles.actionText}>Saved runs</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Grow workflows</Text>
        {GROW_WORKSPACE_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            ([, , options]) => !options?.cannabisOnly || cannabisGrow
          );
          if (!visibleItems.length) return null;
          return (
            <View key={group.title} style={{ marginTop: 12 }}>
              <Text style={styles.cardTitle}>{group.title}</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {visibleItems.map(([label, path]) => {
                  const href = path.startsWith("/")
                    ? withGrow(path, growId)
                    : `/home/personal/grows/${encodeURIComponent(growId)}/${path}`;
                  return (
                    <Link key={label} href={href as any} asChild>
                      <Pressable style={styles.action}>
                        <Text style={styles.actionText}>{label}</Text>
                      </Pressable>
                    </Link>
                  );
                })}
              </View>
            </View>
          );
        })}
        <Text style={styles.recentTitle}>Recent tool runs</Text>
        {recent.length === 0 ? (
          <Text style={styles.recentRow}>No saved runs yet.</Text>
        ) : (
          recent.map((run, index) => (
            <View
              key={String(run?._id || run?.id || `${run?.toolType || "tool"}-${index}`)}
            >
              <Text style={styles.recentRow}>
                {run?.toolType || run?.toolName || "tool"} |{" "}
                {String(run?.createdAt || "").slice(0, 10)}
              </Text>
              <Text style={styles.recentContext}>{toolRunContextLabel(run)}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => viewRun(run)}
                style={styles.inlineAction}
              >
                <Text style={styles.actionText}>
                  {loadingRunId === String(run?._id || run?.id || "")
                    ? "Loading..."
                    : "View result"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <PersonalFeedPlacement
        placement="middle"
        routeKey="personal_grows_growid_tools"
        longContent
      />

      {selectedRun ? (
        <ToolResultSurface
          title={`${selectedRun.toolType || selectedRun.toolName || "Tool"} result`}
          status={selectedRun.status || "completed"}
          summary={selectedRun.summary || toolRunContextLabel(selectedRun)}
          metrics={toolRunMetrics(selectedRun)}
          inputs={selectedRun.inputs || selectedRun.input || selectedRun.params || {}}
          outputs={selectedRun.outputs || selectedRun.output || selectedRun.result || {}}
          notices={toolRunNotices(selectedRun)}
          recommendations={selectedRun.recommendations || []}
          formulas={selectedRun.formulas || []}
          uncertainty={selectedRun.uncertainty || null}
          confidence={selectedRun.confidence || null}
          actions={selectedActions}
          feedback={feedback}
          copyPayload={selectedRun}
        />
      ) : null}

      <PersonalFeedPlacement
        placement="bottom"
        routeKey="personal_grows_growid_tools"
        longContent
      />
    </ScrollView>
  );
}
