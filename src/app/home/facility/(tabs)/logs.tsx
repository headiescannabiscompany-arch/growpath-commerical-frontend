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
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

const LOG_TYPES = ["OBSERVATION", "WATER", "FEED", "IPM", "TRAINING"] as const;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.growlogs)) return res.growlogs;
  return [];
}

function pickId(x: AnyRec) {
  return String(x?.id ?? x?._id ?? x?.logId ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec) {
  return String(x?.title ?? x?.type ?? x?.name ?? "Log Entry");
}

function pickSubtitle(x: AnyRec) {
  const at = x?.createdAt ?? x?.loggedAt ?? x?.at ?? x?.date;
  const grow = x?.growName ?? x?.growId;
  const room = x?.roomName ?? x?.roomId;
  const parts = [
    at ? `At: ${String(at)}` : "",
    grow ? `Grow: ${String(grow)}` : "",
    room ? `Room: ${String(room)}` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function canCreateLog(role: unknown) {
  return ["OWNER", "MANAGER", "STAFF"].includes(String(role || "").toUpperCase());
}

export default function FacilityLogsTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    growId?: string | string[];
    contextName?: string | string[];
  }>();
  const ent = useEntitlements();
  const { palette } = useAppTheme();
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
      <View style={[styles.container, { backgroundColor: palette.page }]}>
        {error ? <InlineError error={error} /> : null}
        {feedback ? (
          <Text
            style={[
              styles.feedback,
              { backgroundColor: palette.surfaceMuted, color: palette.accent }
            ]}
          >
            {feedback}
          </Text>
        ) : null}

        <View style={styles.headerRow}>
          <Text style={[styles.h1, { color: palette.text }]}>
            {contextName ? `${contextName} → Journal` : "Grow Journal"}
          </Text>
          <Text style={[styles.muted, { color: palette.textMuted }]}>
            Operational grow notes and observations. Compliance evidence and exports live
            together under Compliance.
          </Text>
          <Text style={[styles.muted, { color: palette.textMuted }]}>{header}</Text>
        </View>

        {canCreateLog(ent?.facilityRole) ? (
          <View
            style={[
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.border }
            ]}
          >
            <Text style={[styles.cardTitle, { color: palette.text }]}>
              Add journal entry
            </Text>
            <Text style={[styles.muted, { color: palette.textMuted }]}>
              Record work, observations, and measurements where the team will find them
              later.
            </Text>
            <View style={styles.chipRow}>
              {LOG_TYPES.map((option) => {
                const selected = type === option;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityLabel={`Set facility journal type ${option}`}
                    onPress={() => setType(option)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected ? palette.accent : palette.surface,
                        borderColor: selected ? palette.accent : palette.border
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? palette.accentText : palette.text }
                      ]}
                    >
                      {option.toLowerCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextInput
              accessibilityLabel="Facility journal title"
              value={title}
              onChangeText={setTitle}
              style={[
                styles.input,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.border,
                  color: palette.text
                }
              ]}
              placeholder="What happened?"
              placeholderTextColor={palette.textMuted}
            />
            <TextInput
              accessibilityLabel="Facility journal note"
              value={note}
              onChangeText={setNote}
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.border,
                  color: palette.text
                }
              ]}
              placeholder="Observation, readings, materials used, and follow-up"
              placeholderTextColor={palette.textMuted}
              multiline
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save facility journal entry"
              disabled={saving || !title.trim()}
              onPress={() => void addLog()}
              style={[
                styles.primaryBtn,
                { backgroundColor: palette.accent },
                (saving || !title.trim()) && styles.disabled
              ]}
            >
              <Text style={[styles.primaryText, { color: palette.accentText }]}>
                {saving ? "Saving…" : "Save journal entry"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={[styles.muted, { color: palette.textMuted }]}>
              Loading logs…
            </Text>
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
              <View
                style={[
                  styles.empty,
                  { backgroundColor: palette.surface, borderColor: palette.border }
                ]}
              >
                <Text style={[styles.emptyTitle, { color: palette.text }]}>
                  No log entries yet
                </Text>
                <Text style={[styles.muted, { color: palette.textMuted }]}>
                  When logs exist on the backend, they’ll show up here.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const id = pickId(item);
            const itemTitle = pickTitle(item);
            const subtitle = pickSubtitle(item);

            return (
              <Pressable
                onPress={() => {
                  if (!id) return;
                  router.push({ pathname: "/home/facility/logs/[id]", params: { id } });
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border
                  },
                  pressed && styles.pressed
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.rowTitle, { color: palette.text }]}
                    numberOfLines={1}
                  >
                    {itemTitle}
                  </Text>
                  {subtitle ? (
                    <Text
                      style={[styles.rowSub, { color: palette.textMuted }]}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.chev, { color: palette.textMuted }]}>›</Text>
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
    borderRadius: radius.card,
    fontWeight: "800",
    marginBottom: 10,
    padding: 10
  },
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 9,
    marginBottom: 12,
    padding: 14
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  chipText: { fontSize: 12, fontWeight: "800" },
  input: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 10
  },
  textArea: { minHeight: 76, textAlignVertical: "top" },
  primaryBtn: {
    alignItems: "center",
    borderRadius: radius.card,
    padding: 11
  },
  primaryText: { fontWeight: "900" },
  disabled: { opacity: 0.5 },

  loading: { paddingVertical: 18, alignItems: "center" },
  list: { paddingVertical: 6 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1
  },
  pressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  rowSub: { opacity: 0.7 },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 10 },

  empty: {
    paddingVertical: 26,
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    marginTop: 8
  },
  emptyTitle: { fontSize: 16, fontWeight: "900" }
});
