import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler, type UiErrorState } from "@/hooks/useApiErrorHandler";
import { sourceObjectHref } from "@/utils/sourceLinks";

type AnyRec = Record<string, any>;

function getId(params: Record<string, any>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function renderKV(obj: AnyRec | null, key: string) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;

  return (
    <View key={key} style={styles.kv}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v} selectable>
        {typeof v === "string" ? v : JSON.stringify(v)}
      </Text>
    </View>
  );
}

function readableValue(value: any) {
  if (value === undefined || value === null || value === "") return "";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "object") {
    if (value.label) return String(value.label);
    return JSON.stringify(value);
  }
  return String(value);
}

function firstLinkedValue(...values: any[]) {
  return values.find((value) => {
    if (Array.isArray(value)) return value.filter(Boolean).length > 0;
    return value !== undefined && value !== null && value !== "";
  });
}

function taskContextRows(task: AnyRec | null) {
  if (!task) return [];
  const rows = [
    ["Source", [task.sourceType, task.sourceId].filter(Boolean).join(": ")],
    ["Storefront", task.linkedStorefrontSlug || task.linkedStorefrontId],
    ["Action item type", task.actionItemType],
    ["Action item", task.actionItemTitle],
    ["Setup item", task.setupItemLabel],
    ["Setup reason", task.setupItemHelper],
    ["Campaign type", task.campaignKind],
    ["Campaign title", task.campaignTitle],
    ["Alert source type", task.alertSourceType],
    ["Alert source ID", task.alertSourceId],
    ["Grow interests", task.growInterests],
    ["Products", firstLinkedValue(task.linkedProductIds, task.linkedProductId)],
    [
      "Product line",
      firstLinkedValue(task.linkedProductLineIds, task.linkedProductLineId)
    ],
    ["Recipe", task.linkedRecipeId],
    ["Product batch", task.linkedProductBatchId],
    ["Product trial", task.linkedProductTrialId],
    ["Published products", task.linkedPublishedProductIds],
    ["Courses", firstLinkedValue(task.linkedCourseIds, task.linkedCourseId)],
    ["Lives", firstLinkedValue(task.linkedLiveIds, task.linkedLiveId)],
    ["Feed campaigns", firstLinkedValue(task.linkedFeedPostIds, task.linkedFeedPostId)],
    ["Forum/Q&A", task.linkedForumThreadId],
    ["Grow evidence", firstLinkedValue(task.linkedGrowIds, task.linkedGrowId)],
    ["Facility", task.linkedFacilityId],
    ["Room", task.linkedRoomId],
    ["Order", task.linkedOrderId],
    ["Alert", task.linkedAlertId],
    ["Campaign starts", task.campaignStartsAt],
    ["Campaign ends", task.campaignEndsAt],
    ["Live starts", task.liveStartsAt],
    ["Live ends", task.liveEndsAt],
    ["Due", task.dueAt],
    ["Recurrence", task.recurrenceRule],
    ["Reminder", task.reminderPlan]
  ];
  return rows
    .map(([label, value]) => ({ label: String(label), value: readableValue(value) }))
    .filter((row) => row.value);
}

function taskSourceId(task: AnyRec | null): string {
  if (!task) return "";
  const sourceType = String(task.sourceType || "");
  const directSource = firstLinkedValue(task.sourceId, task.sourceObjectId);
  if (directSource) return String(directSource);
  if (sourceType === "storefront") return String(task.linkedStorefrontId || "");
  if (sourceType === "product") return String(task.linkedProductId || "");
  if (sourceType === "product_batch") return String(task.linkedProductBatchId || "");
  if (sourceType === "product_trial") return String(task.linkedProductTrialId || "");
  if (sourceType === "course" || sourceType === "lesson") {
    return String(task.linkedCourseId || task.linkedLessonId || "");
  }
  if (sourceType === "live" || sourceType === "live_replay") {
    return String(task.linkedLiveId || "");
  }
  if (sourceType === "feed_campaign" || sourceType === "feed_post") {
    return String(firstLinkedValue(task.linkedFeedPostIds, task.linkedFeedPostId) || "");
  }
  return String(
    task.linkedAlertId ||
      task.linkedOrderId ||
      task.linkedForumThreadId ||
      task.linkedRecipeId ||
      task.linkedProductBatchId ||
      task.linkedProductTrialId ||
      task.linkedProductId ||
      task.linkedCourseId ||
      task.linkedLiveId ||
      task.linkedStorefrontId ||
      ""
  );
}

function taskSourcePath(task: AnyRec | null): string {
  return sourceObjectHref({
    ...task,
    sourceId: taskSourceId(task),
    workspaceType: "commercial"
  });
}

export default function CommercialTaskDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = getId(params as any);

  const apiErrorMapper = useApiErrorHandler();
  const [error, setError] = useState<UiErrorState | null>(null);
  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const clearError = useCallback(() => setError(null), []);
  const handleApiError = useCallback(
    (err: any) => {
      setError(
        apiErrorMapper.toInlineError(err) || {
          title: "Task action failed",
          message: err?.message || "Unable to complete the task action.",
          code: err?.code,
          requestId: err?.requestId ?? null
        }
      );
    },
    [apiErrorMapper]
  );

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!id) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.taskGlobal(id), { method: "GET" });
        setItem(res ?? null);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, clearError, handleApiError]
  );

  useEffect(() => {
    load();
  }, [load]);

  const keys = useMemo(() => (item ? Object.keys(item).sort() : []), [item]);
  const title = String(item?.title || item?.name || "Task");
  const description = String(item?.description || item?.notes || item?.message || "");
  const status = String(item?.status || (item?.completed ? "complete" : "open"));
  const priority = String(item?.priority || "normal");
  const sourcePath = taskSourcePath(item);
  const contextRows = useMemo(() => taskContextRows(item), [item]);

  async function completeTask() {
    if (!id || !item) return;
    setSaving(true);
    setFeedback("");
    try {
      clearError();
      const completedAt = new Date().toISOString();
      const updated = await apiRequest(endpoints.taskGlobal(id), {
        method: "PATCH",
        body: {
          status: "complete",
          completed: true,
          completedAt
        }
      });
      setItem(
        (updated as AnyRec) ?? {
          ...item,
          status: "complete",
          completed: true,
          completedAt
        }
      );
      setFeedback("Task marked complete.");
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenBoundary title="Task" showBack backFallbackHref="/home/commercial/tasks">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Task</Text>
          <Text style={styles.muted}>id: {id || "(missing)"}</Text>
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading task…</Text>
          </View>
        ) : null}

        {item ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            {description ? <Text style={styles.cardText}>{description}</Text> : null}
            <View style={styles.metaRow}>
              <Text style={styles.badge}>{status}</Text>
              <Text style={styles.badgeMuted}>{priority}</Text>
            </View>
            <Pressable
              onPress={completeTask}
              disabled={saving || status.toLowerCase() === "complete"}
              accessibilityRole="button"
              accessibilityLabel="Complete commercial task"
              style={[
                styles.primaryBtn,
                (saving || status.toLowerCase() === "complete") && styles.disabled
              ]}
            >
              <Text style={styles.primaryText}>
                {saving ? "Saving..." : "Mark Complete"}
              </Text>
            </Pressable>
            {sourcePath ? (
              <Pressable
                onPress={() => router.push(sourcePath as any)}
                accessibilityRole="link"
                accessibilityLabel="View commercial task source"
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryText}>View Source</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {contextRows.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Task context</Text>
            <View style={styles.kvWrap}>
              {contextRows.map((row) => (
                <View key={row.label} style={styles.kv}>
                  <Text style={styles.k}>{row.label}</Text>
                  <Text style={styles.v} selectable>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          {item ? (
            <View style={styles.kvWrap}>{keys.map((k) => renderKV(item, k))}</View>
          ) : (
            <Text style={styles.muted}>
              {id ? "No task returned." : "Missing task id."}
            </Text>
          )}
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  headerRow: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7 },
  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white"
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 6 },
  cardText: { color: "#334155", lineHeight: 20, marginBottom: 10 },
  feedback: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
    borderWidth: 1,
    borderRadius: 10,
    color: "#047857",
    fontWeight: "800",
    padding: 10
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  badge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 999,
    color: "#3730A3",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase"
  },
  badgeMuted: {
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    color: "#475569",
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase"
  },
  primaryBtn: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  primaryText: { color: "white", fontWeight: "900" },
  secondaryBtn: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  secondaryText: { color: "#0F172A", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  kvWrap: { marginTop: 6 },
  kv: { gap: 4, marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 }
});
