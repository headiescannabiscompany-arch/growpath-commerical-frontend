import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.tasks)) return res.tasks;
  return [];
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.taskId ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec): string {
  return String(x?.title ?? x?.name ?? x?.label ?? x?.type ?? "Task");
}

function pickSubtitle(x: AnyRec): string {
  const due = x?.dueAt ?? x?.dueDate ?? x?.due;
  const status = x?.status ?? x?.state;
  const assignee = x?.assigneeName ?? x?.assignee ?? x?.assignedTo;

  const a = due ? `Due: ${String(due)}` : "";
  const b = status ? `Status: ${String(status)}` : "";
  const c = assignee ? `Assignee: ${String(assignee)}` : "";

  return [a, b, c].filter(Boolean).join(" -  ");
}

export default function FacilityTasksRoute() {
  const router = useRouter();
  const ent = useEntitlements();
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

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.tasks(facilityId), { method: "GET" });
        setItems(asArray(res));
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, clearError, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const canWrite = !!ent?.can?.(CAPABILITY_KEYS.TASKS_WRITE);

  const createTask = useCallback(async () => {
    if (!facilityId || !canWrite) return;
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      clearError();
      await apiRequest(endpoints.tasks(facilityId), {
        method: "POST",
        data: {
          title,
          notes: newNotes.trim() || undefined,
          scope: "facility"
        }
      });
      setNewTitle("");
      setNewNotes("");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setCreating(false);
    }
  }, [facilityId, canWrite, newTitle, newNotes, clearError, handleApiError, load]);

  const header = useMemo(() => {
    const n = items.length;
    return n === 1 ? "1 task" : `${n} tasks`;
  }, [items.length]);

  return (
    <ScreenBoundary title="Tasks">
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}

        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Task</Text>
          {!canWrite ? (
            <Text style={styles.muted}>
              You do not have permission to create tasks.
            </Text>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                style={styles.input}
                placeholder="Task title"
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                value={newNotes}
                onChangeText={setNewNotes}
                style={[styles.input, styles.inputMultiline]}
                placeholder="Notes"
                multiline
              />

              <TouchableOpacity
                onPress={createTask}
                disabled={creating || !newTitle.trim()}
                style={[
                  styles.primaryBtn,
                  (creating || !newTitle.trim()) && styles.primaryBtnDisabled
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {creating ? "Creating..." : "Create Task"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>\n        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading tasks...</Text>
          </View>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
            />
          }
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No tasks yet</Text>
                <Text style={styles.muted}>
                  When tasks exist on the backend, they'll show up here.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const id = pickId(item);
            const title = pickTitle(item);
            const subtitle = pickSubtitle(item);

            return (
              <Pressable
                onPress={() => {
                  if (!id) return;
                  router.push({ pathname: "/home/facility/tasks/[id]", params: { id } });
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.chev}>></Text>
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  muted: { opacity: 0.7 },

  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  form: { gap: 8 },
  label: { fontSize: 12, opacity: 0.7 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white"
  },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: "white", fontWeight: "800" },

  loading: { paddingVertical: 18, alignItems: "center" },

  list: { paddingVertical: 6 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  rowPressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  rowSub: { opacity: 0.7 },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 10 },

  empty: { paddingVertical: 26, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 }
});


