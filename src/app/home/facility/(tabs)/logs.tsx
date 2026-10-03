import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  useFacilityRecordRead,
  useFacilityRecordScope
} from "@/features/facility/useFacilityRecordRead";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

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

const LOG_TYPES = ["OBSERVATION", "WATER", "FEED", "IPM", "TRAINING"] as const;

export default function FacilityLogsTab() {
  const params = useLocalSearchParams();
  const scope = useFacilityRecordScope([
    params.growId,
    params.sopRunId,
    params.sopStepId,
    params.contextName
  ]);
  return <FacilityLogsContent key={scope} />;
}

function FacilityLogsContent() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const params = useLocalSearchParams<{
    growId?: string | string[];
    contextName?: string | string[];
    sopRunId?: string | string[];
    sopStepId?: string | string[];
  }>();
  const ent = useEntitlements();
  const facilityRole = String(ent?.facilityRole || "").toUpperCase();
  const canWriteLogs =
    Boolean(ent?.can?.(CAPABILITY_KEYS.GROWLOGS_WRITE)) &&
    ["OWNER", "MANAGER", "STAFF"].includes(facilityRole);
  const { selectedId: facilityId } = useFacility();
  const contextGrowId = String(firstParam(params.growId) || "");
  const contextName = String(firstParam(params.contextName) || "");
  const contextSopRunId = String(firstParam(params.sopRunId) || "");

  const {
    mounted,
    error,
    handleApiError,
    clearError,
    hasLoaded,
    setHasLoaded,
    readFailed,
    setReadFailed
  } = useFacilityRecordRead();

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const loadInFlightRef = useRef(false);
  const savingRef = useRef(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState<(typeof LOG_TYPES)[number]>("OBSERVATION");

  useEffect(() => {
    if (!contextSopRunId || !contextName) return;
    setTitle((current) => current || `SOP evidence: ${contextName}`);
  }, [contextName, contextSopRunId]);

  const load = useCallback(
    async (opts?: { refresh?: boolean; afterSave?: boolean }) => {
      if (
        !facilityId ||
        loadInFlightRef.current ||
        (savingRef.current && !opts?.afterSave)
      )
        return;
      loadInFlightRef.current = true;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(
          `${endpoints.growlogs(facilityId)}${
            contextGrowId ? `?growId=${encodeURIComponent(contextGrowId)}` : ""
          }`
        );
        if (!mounted.current) return;
        setItems(asArray(res));
        setHasLoaded(true);
        setReadFailed(false);
      } catch (e) {
        if (!mounted.current) return;
        setReadFailed(true);
        handleApiError(e);
      } finally {
        loadInFlightRef.current = false;
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      facilityId,
      contextGrowId,
      clearError,
      handleApiError,
      mounted,
      setHasLoaded,
      setReadFailed
    ]
  );

  const readable = hasLoaded && !readFailed && !loading && !refreshing;
  const canSave = readable && !saving && canWriteLogs && Boolean(title.trim());

  const addLog = useCallback(async () => {
    if (!facilityId || !canSave || savingRef.current || loadInFlightRef.current) return;
    savingRef.current = true;
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
      if (!mounted.current) return;
      setTitle("");
      setNote("");
      setType("OBSERVATION");
      setFeedback("Journal entry saved to the grow timeline.");
      await load({ refresh: true, afterSave: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  }, [
    facilityId,
    title,
    note,
    type,
    contextGrowId,
    canSave,
    mounted,
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
    if (!hasLoaded) return "Journal count unknown";
    const n = items.length;
    return n === 1 ? "1 entry" : `${n} entries`;
  }, [items.length, hasLoaded]);

  return (
    <ScreenBoundary
      title={contextName ? `${contextName} journal` : "Facility Grow Journal"}
      showBack
      preferBackFallback={Boolean(contextSopRunId || contextGrowId)}
      backFallbackHref={
        contextSopRunId
          ? `/home/facility/sop-runs/${contextSopRunId}`
          : contextGrowId
            ? `/home/facility/grows/${contextGrowId}`
            : "/home/facility/dashboard"
      }
    >
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}
        {feedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </Text>
        ) : null}

        <View style={styles.headerRow}>
          <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
            {contextName ? `${contextName} → Journal` : "Facility Grow Journal"}
          </Text>
          <Text style={styles.muted}>
            Operational grow notes and observations. Compliance evidence and exports live
            together under Compliance.
          </Text>
          <Text style={styles.muted}>{header}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh facility journal"
            disabled={loading || refreshing || saving}
            accessibilityState={{ disabled: loading || refreshing || saving }}
            onPress={() => void load({ refresh: true })}
          >
            <Text style={styles.secondaryText}>{readFailed ? "Retry" : "Refresh"}</Text>
          </Pressable>
        </View>
        {!hasLoaded && readFailed ? (
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            Journal unavailable. Retry to load current records.
          </Text>
        ) : hasLoaded && (refreshing || readFailed) ? (
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            {refreshing
              ? "Previously loaded journal — refreshing current records."
              : "Previously loaded journal — refresh failed. These are not current verified counts."}
          </Text>
        ) : null}

        {canWriteLogs ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              Add journal entry
            </Text>
            <Text style={styles.muted}>
              {contextSopRunId
                ? `Record what was done for “${contextName}”, the result, and any follow-up. Saving this entry creates the evidence record; then return to the SOP checklist and mark the step Done or Skipped.`
                : "Record work, observations, and measurements where the team will find them later."}
            </Text>
            <View
              accessibilityLabel="Facility journal type"
              accessibilityRole="radiogroup"
              style={styles.chipRow}
            >
              {LOG_TYPES.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityLabel={`Set facility journal type ${option}`}
                  disabled={saving}
                  accessibilityState={{ checked: type === option }}
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
              editable={!saving}
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholder="What happened?"
              placeholderTextColor={palette.textMuted}
            />
            <TextInput
              accessibilityLabel="Facility journal note"
              editable={!saving}
              value={note}
              onChangeText={setNote}
              style={[styles.input, styles.textArea]}
              placeholder="Observation, readings, materials used, and follow-up"
              placeholderTextColor={palette.textMuted}
              multiline
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save facility journal entry"
              accessibilityState={{ busy: saving, disabled: !canSave }}
              disabled={!canSave}
              onPress={() => void addLog()}
              style={[styles.primaryBtn, !canSave && styles.disabled]}
            >
              <Text style={styles.primaryText}>
                {saving ? "Saving…" : "Save journal entry"}
              </Text>
            </Pressable>
            {contextSopRunId ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Return to SOP checklist after recording ${contextName}`}
                onPress={() => router.push(`/home/facility/sop-runs/${contextSopRunId}`)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryText}>Return to SOP checklist</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View
            accessibilityLabel="Loading facility journal"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading logs…</Text>
          </View>
        ) : null}

        <FlatList
          accessibilityLabel="Facility journal entries"
          data={items}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
              tintColor={palette.accent}
              colors={[palette.accent]}
              progressBackgroundColor={palette.surface}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            hasLoaded && !loading && !readFailed ? (
              <View style={styles.empty}>
                <Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>
                  No log entries yet
                </Text>
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
                accessibilityRole="link"
                accessibilityLabel={`Open facility journal entry ${title}`}
                accessibilityState={{ disabled: !id }}
                disabled={!id}
                onPress={() => {
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

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16 },
    headerRow: { marginBottom: 12 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900", marginBottom: 4 },
    muted: { color: palette.textMuted },
    feedback: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      color: palette.success,
      fontWeight: "800",
      marginBottom: 10,
      padding: 10
    },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      marginBottom: 12,
      padding: 14
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    chip: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    chipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    chipText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    chipTextSelected: { color: palette.accentText },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      padding: 10
    },
    textArea: { minHeight: 76, textAlignVertical: "top" },
    primaryBtn: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      padding: 11
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    secondaryBtn: {
      alignItems: "center",
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryText: { color: palette.link, fontWeight: "900" },
    disabled: { opacity: 0.5 },

    loading: { paddingVertical: 18, alignItems: "center" },
    list: { paddingVertical: 6 },

    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface
    },
    pressed: { opacity: 0.85 },
    rowTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 4 },
    rowSub: { color: palette.textMuted },
    chev: { color: palette.textMuted, fontSize: 22, opacity: 0.5, paddingLeft: 10 },

    empty: { paddingVertical: 26, alignItems: "center" },
    emptyTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 6 }
  });
