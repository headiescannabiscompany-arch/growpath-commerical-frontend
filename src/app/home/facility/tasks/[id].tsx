import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";

type AnyRec = Record<string, any>;

function pickTitle(x: AnyRec): string {
  return String(x?.title ?? x?.name ?? x?.label ?? x?.type ?? "Task Detail");
}

function renderKV(obj: AnyRec, key: string) {
  const v = obj?.[key];
  if (v === undefined || v === null || v === "") return null;
  return (
    <View style={styles.kv} key={key}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v}>{typeof v === "string" ? v : JSON.stringify(v)}</Text>
    </View>
  );
}

export default function FacilityTaskDetail() {
  const router = useRouter();
  const ent = useEntitlements();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedId: facilityId } = useFacility();

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignedTo, setAssignedTo] = useState("");

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId || !id) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.task(facilityId, String(id)));
        setItem(res ?? null);
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, id, clearError, handleApiError]
  );
  const canWrite = !!ent?.can?.(CAPABILITY_KEYS.TASKS_WRITE);
  const canAssign =
    canWrite && (ent?.facilityRole === "OWNER" || ent?.facilityRole === "MANAGER");

  useEffect(() => {
    if (!item) return;
    const current =
      item.assignedTo?.id ??
      item.assignedTo?._id ??
      item.assignedTo ??
      item.assignee ??
      "";
    setAssignedTo(current ? String(current) : "");
  }, [item]);

  const updateTask = useCallback(
    async (patch: AnyRec) => {
      if (!facilityId || !id || !canWrite) return;
      setSaving(true);
      try {
        clearError();
        const res = await apiRequest(endpoints.task(facilityId, String(id)), {
          method: "PATCH",
          data: patch
        });
        setItem(res ?? item);
      } catch (e) {
        handleApiError(e);
      } finally {
        setSaving(false);
      }
    },
    [facilityId, id, canWrite, clearError, handleApiError, item]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    if (!id) {
      router.back();
      return;
    }
    load();
  }, [facilityId, id, load, router]);

  const title = useMemo(() => (item ? pickTitle(item) : "Task Detail"), [item]);

  const keys = useMemo(() => {
    if (!item) return [];
    const preferred = [
      "id",
      "_id",
      "title",
      "status",
      "dueAt",
      "dueDate",
      "assignee",
      "createdAt",
      "updatedAt",
      "notes"
    ];
    const rest = Object.keys(item)
      .filter((k) => !preferred.includes(k))
      .sort();
    return [...preferred.filter((k) => k in item), ...rest];
  }, [item]);

  return (
    <ScreenBoundary title={title}>
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

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading task...</Text>
          </View>
        ) : null}

        {!loading && !item ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Not found</Text>
            <Text style={styles.muted}>This task could not be loaded.</Text>
          </View>
        ) : null}
        {item ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Update Task</Text>
            {!canWrite ? (
              <Text style={styles.muted}>
                You do not have permission to update tasks.
              </Text>
            ) : (
              <View style={styles.form}>
                {canAssign ? (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Assign to (user id)</Text>
                    <TextInput
                      value={assignedTo}
                      onChangeText={setAssignedTo}
                      style={styles.input}
                      placeholder="user id"
                    />
                    <TouchableOpacity
                      onPress={() => updateTask({ assignedTo: assignedTo.trim() || null })}
                      disabled={saving}
                      style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                    >
                      <Text style={styles.primaryBtnText}>
                        {saving ? "Saving..." : "Assign"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <View style={styles.statusRow}>
                  <TouchableOpacity
                    onPress={() => updateTask({ status: "IN_PROGRESS" })}
                    disabled={saving}
                    style={[styles.secondaryBtn, saving && styles.primaryBtnDisabled]}
                  >
                    <Text style={styles.secondaryBtnText}>Mark In Progress</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => updateTask({ status: "DONE" })}
                    disabled={saving}
                    style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                  >
                    <Text style={styles.primaryBtnText}>Mark Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : null}      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
  muted: { opacity: 0.7 },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    gap: 10
  },
  h1: { fontSize: 18, fontWeight: "900" },

  sectionTitle: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  form: { gap: 12 },
  formGroup: { gap: 8 },
  label: { fontSize: 12, opacity: 0.7 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white"
  },
  statusRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  primaryBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center"
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.18)",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center"
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "white", fontWeight: "800" },
  secondaryBtnText: { fontWeight: "800" },

  kvWrap: { gap: 10, marginTop: 8 },
  kv: { gap: 4 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 },

  empty: { paddingVertical: 26, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" }
});


