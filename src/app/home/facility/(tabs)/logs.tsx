import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.growlogs)) return res.growlogs;
  return [];
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.logId ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec): string {
  return String(x?.title ?? x?.type ?? x?.name ?? "Log Entry");
}

function pickSubtitle(x: AnyRec): string {
  const at = x?.createdAt ?? x?.loggedAt ?? x?.at ?? x?.date;
  const grow = x?.growName ?? x?.growId;
  const room = x?.roomName ?? x?.roomId;
  const parts = [
    at ? `At: ${String(at)}` : "",
    grow ? `Grow: ${String(grow)}` : "",
    room ? `Room: ${String(room)}` : ""
  ].filter(Boolean);
  return parts.join(" • ");
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function canCreateLog(role: unknown) {
  return ["OWNER", "MANAGER", "STAFF"].includes(String(role || "").toUpperCase());
}

const LOG_TYPES = ["OBSERVATION", "WATER", "FEED", "IPM", "TRAINING"] as const;

export default function FacilityLogsTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    growId?: string | string[];
    contextName?: string | string[];
  }>();
  const ent = useEntitlements();
  const { selectedId: facilityId } = useFacility();
  const contextGrowId = String(firstParam(params.growId) || "");
  const contextName = String(firstParam(params.contextName) || "");

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
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<(typeof LOG_TYPES)[number]>("OBSERVATION");

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(
          `${endpoints.growlogs(facilityId)}${
            contextGrowId ? `?growId=${encodeURIComponent(contextGrowId)}` : ""
          }`
        );
        setItems(asArray(res));
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, contextGrowId, clearError, handleApiError]
  );

  const addLog = useCallback(async () => {
    if (!facilityId || !title.trim() || !canCreateLog(ent?.facilityRole)) return;
    setSaving(true);
    setFeedback("");
    try {
      clearError();
      await apiRequest(endpoints.growlogs(facilityId), {
        method: "POST",
        body: {
          title: title.trim(),
          note: note.trim(),
          type,
          growId: contextGrowId || undefined,
          date: new Date().toISOString()
        }
      });
      setTitle("");
      setNote("");
      setType("OBSERVATION");
      setFeedback("Journal entry saved to the grow timeline.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      setSaving(false);
    }
  }, [
    facilityId,
    title,
    note,
    type,
    contextGrowId,
    ent?.facilityRole,
    clearError,
    handleApiError,
    load
  ]);

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const header = useMemo(() => {
    const n = items.length;
    return n === 1 ? "1 entry" : `${n} entries`;
  }, [items.length]);

  return (
    <ScreenBoundary
      title={contextName ? `${contextName} journal` : "Grow Journal"}
      showBack={Boolean(contextGrowId)}
      backFallbackHref={
        contextGrowId ? `/home/facility/grows/${contextGrowId}` : undefined
      }
    >
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>
            {contextName ? `${contextName} → Journal` : "Grow Journal"}
          </Text>
          <Text style={styles.muted}>
            Operational grow notes and observations. Compliance evidence and exports live
            together under Compliance.
          </Text>
          <Text style={styles.muted}>{header}</Text>
        </View>

        {canCreateLog(ent?.facilityRole) ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add journal entry</Text>
            <Text style={styles.muted}>
              Record work, observations, and measurements where the team will find them
              later.
            </Text>
            <View style={styles.chipRow}>
              {LOG_TYPES.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={`Set facility journal type ${option}`}
                  onPress={() => setType(option)}
                  style={[styles.chip, type === option && styles.chipSelected]}
                >
                  <Text
                    style={[styles.chipText, type === option && styles.chipTextSelected]}
                  >
                    {option.toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              accessibilityLabel="Facility journal title"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="What happened?"
            />
            <TextInput
              accessibilityLabel="Facility journal note"
              value={note}
              onChangeText={setNote}
              style={[styles.input, styles.textArea]}
              placeholder="Observation, readings, materials used, and follow-up"
              multiline
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save facility journal entry"
              disabled={saving || !title.trim()}
              onPress={() => void addLog()}
              style={[styles.primaryBtn, (saving || !title.trim()) && styles.disabled]}
            >
              <Text style={styles.primaryText}>
                {saving ? "Saving…" : "Save journal entry"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading logs…</Text>
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
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No log entries yet</Text>
                <Text style={styles.muted}>
                  When logs exist on the backend, they’ll show up here.
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
                  router.push({ pathname: "/home/facility/logs/[id]", params: { id } });
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
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
                <Text style={styles.chev}>›</Text>
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
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { opacity: 0.7 },
  feedback: {
    backgroundColor: "#ecfdf5",
    borderRadius: radius.card,
    color: "#166534",
    fontWeight: "800",
    marginBottom: 10,
    padding: 10
  },
  card: {
    backgroundColor: "white",
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 9,
    marginBottom: 12,
    padding: 14
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    backgroundColor: "white",
    borderColor: "rgba(0,0,0,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  chipSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  chipText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  chipTextSelected: { color: "white" },
  input: {
    backgroundColor: "white",
    borderColor: "rgba(0,0,0,0.14)",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 10
  },
  textArea: { minHeight: 76, textAlignVertical: "top" },
  primaryBtn: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: radius.card,
    padding: 11
  },
  primaryText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.5 },

  loading: { paddingVertical: 18, alignItems: "center" },
  list: { paddingVertical: 6 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  pressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  rowSub: { opacity: 0.7 },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 10 },

  empty: { paddingVertical: 26, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", marginBottom: 6 }
});
