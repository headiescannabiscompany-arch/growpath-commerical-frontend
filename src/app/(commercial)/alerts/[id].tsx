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
import { useLocalSearchParams } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler, type UiErrorState } from "@/hooks/useApiErrorHandler";

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

function linkedFieldsForAlertSource(item: AnyRec | null) {
  if (!item) return {};
  const sourceType = String(item.sourceType || item.triggerSourceType || "");
  const sourceId = alertSourceReference(item);
  if (!sourceId) return {};
  switch (sourceType) {
    case "product":
      return { linkedProductId: sourceId };
    case "product_batch":
      return { linkedProductBatchId: sourceId };
    case "product_trial":
      return { linkedProductTrialId: sourceId };
    case "course":
      return { linkedCourseId: sourceId };
    case "live":
      return { linkedLiveId: sourceId };
    case "storefront":
      return { linkedStorefrontId: sourceId };
    case "feed_campaign":
      return { linkedFeedPostId: sourceId };
    case "order":
      return { linkedOrderId: sourceId };
    case "room":
      return { linkedRoomId: sourceId };
    case "facility":
      return { linkedFacilityId: sourceId };
    case "facility_run":
      return { linkedFacilityRunId: sourceId };
    case "sop":
      return { linkedSopId: sourceId };
    case "forum":
      return { linkedForumThreadId: sourceId };
    default:
      return {};
  }
}

function alertSourceReference(item: AnyRec | null) {
  if (!item) return "";
  const values = [
    item.sourceId,
    item.sourceObjectId,
    item.linkedProductId,
    item.linkedProductBatchId,
    item.linkedProductTrialId,
    item.linkedCourseId,
    item.linkedLiveId,
    item.linkedStorefrontId,
    item.linkedFeedPostId,
    item.linkedOrderId,
    item.linkedRoomId,
    item.linkedFacilityId,
    item.linkedFacilityRunId,
    item.linkedSopId,
    item.linkedForumThreadId
  ];
  const value = values.find(
    (next) => next !== undefined && next !== null && String(next)
  );
  return value ? String(value) : "";
}

export default function CommercialAlertDetailRoute() {
  const params = useLocalSearchParams();
  const id = getId(params as any);

  const apiErrorMapper = useApiErrorHandler();
  const [error, setError] = useState<UiErrorState | null>(null);
  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [feedback, setFeedback] = useState("");

  const clearError = useCallback(() => setError(null), []);
  const handleApiError = useCallback(
    (err: any) => {
      setError(
        apiErrorMapper.toInlineError(err) || {
          title: "Alert action failed",
          message: err?.message || "Unable to complete the alert action.",
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
        const res = await apiRequest(endpoints.alertGlobal(id), { method: "GET" });
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
  const title = String(item?.title || item?.name || item?.message || "Alert follow-up");
  const message = String(item?.message || item?.description || item?.body || "");
  const severity = String(item?.severity || item?.priority || "normal").toLowerCase();

  async function createTaskFromAlert() {
    if (!id || !item) return;
    setCreatingTask(true);
    setFeedback("");
    try {
      clearError();
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 1);
      await apiRequest(endpoints.tasksGlobal, {
        method: "POST",
        body: {
          title,
          description: message || `Follow up on alert ${id}.`,
          priority:
            severity === "critical" || severity === "urgent"
              ? "high"
              : severity === "warning"
                ? "medium"
                : "normal",
          dueAt: dueAt.toISOString(),
          sourceType: "alert",
          sourceId: id,
          sourceObjectId: id,
          linkedAlertId: id,
          alertSourceType: item.sourceType || item.triggerSourceType || undefined,
          alertSourceId: alertSourceReference(item) || undefined,
          ...linkedFieldsForAlertSource(item),
          status: "open"
        }
      });
      setFeedback("Task created from this alert.");
    } catch (e) {
      handleApiError(e);
    } finally {
      setCreatingTask(false);
    }
  }

  return (
    <ScreenBoundary title="Alert" showBack backFallbackHref="/home/alerts">
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
          <Text style={styles.h1}>Alert</Text>
          <Text style={styles.muted}>id: {id || "(missing)"}</Text>
        </View>
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading alert…</Text>
          </View>
        ) : null}

        {item ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{title}</Text>
            {message ? <Text style={styles.cardText}>{message}</Text> : null}
            <View style={styles.metaRow}>
              <Text style={styles.badge}>{severity}</Text>
              <Text style={styles.muted}>Source: alert</Text>
            </View>
            <Pressable
              onPress={createTaskFromAlert}
              disabled={creatingTask}
              accessibilityRole="button"
              accessibilityLabel="Create task from alert"
              style={[styles.primaryBtn, creatingTask && styles.disabled]}
            >
              <Text style={styles.primaryText}>
                {creatingTask ? "Creating..." : "Create Task From Alert"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          {item ? (
            <View style={styles.kvWrap}>{keys.map((k) => renderKV(item, k))}</View>
          ) : (
            <Text style={styles.muted}>
              {id ? "No alert returned." : "Missing alert id in route params."}
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
  primaryBtn: {
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  primaryText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  kvWrap: { marginTop: 6 },
  kv: { gap: 4, marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 }
});
