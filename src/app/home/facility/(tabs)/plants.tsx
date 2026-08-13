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

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { createPlant } from "@/api/plants";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacilityGrows } from "@/features/facility/useFacilityGrows";
import { useFacilityRooms } from "@/features/facility/useFacilityRooms";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type AnyRec = Record<string, any>;

const STAGES = ["Clone", "Veg", "Flower", "Dry", "Cure"] as const;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.plants)) return res.plants;
  return [];
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.plantId ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec): string {
  return String(x?.name ?? x?.tag ?? x?.label ?? x?.strain ?? "Plant");
}

function pickSubtitle(x: AnyRec): string {
  const room = x?.roomName ?? x?.room ?? x?.roomId;
  const stage = x?.stage ?? x?.phase ?? x?.status;
  const batch = x?.batch ?? x?.batchId ?? x?.batchCycleId;
  const grow = x?.growName ?? x?.growId ?? x?.grow;
  const parts = [
    room ? `Room: ${String(room)}` : "",
    stage ? `Stage: ${String(stage)}` : "",
    batch ? `Batch: ${String(batch)}` : "",
    grow ? `Grow: ${String(grow)}` : ""
  ].filter(Boolean);
  return parts.join(" | ");
}

function hasRoomLink(x: AnyRec) {
  return Boolean(x?.roomName || x?.room || x?.roomId);
}

function hasBatchLink(x: AnyRec) {
  return Boolean(x?.batch || x?.batchId || x?.batchCycleId || x?.metrcTag);
}

function isActivePlant(x: AnyRec) {
  const status = String(x?.status ?? x?.stage ?? "").toLowerCase();
  return x?.isActive !== false && status !== "deleted" && status !== "inactive";
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function contextRowId(row: AnyRec) {
  return String(row?.id ?? row?._id ?? row?.growId ?? row?.roomId ?? "");
}

export default function FacilityPlantsTab() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const params = useLocalSearchParams<{
    growId?: string | string[];
    roomId?: string | string[];
    contextName?: string | string[];
  }>();
  const ent = useEntitlements();
  const facilityRole = String(ent?.facilityRole || "").toUpperCase();
  const canWritePlants =
    Boolean(ent?.can?.(CAPABILITY_KEYS.PLANTS_WRITE)) &&
    ["OWNER", "MANAGER"].includes(facilityRole);
  const { selectedId: facilityId } = useFacility();
  const { rooms } = useFacilityRooms(facilityId);
  const { grows } = useFacilityGrows(facilityId);
  const contextGrowId = String(firstParam(params.growId) || "");
  const contextRoomId = String(firstParam(params.roomId) || "");
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
  const loadInFlightRef = useRef(false);
  const savingRef = useRef(false);

  const [plantName, setPlantName] = useState("");
  const [plantTag, setPlantTag] = useState("");
  const [plantStrain, setPlantStrain] = useState("");
  const [plantStage, setPlantStage] = useState("Veg");
  const [roomId, setRoomId] = useState("");
  const [growId, setGrowId] = useState("");

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId || loadInFlightRef.current) return;
      loadInFlightRef.current = true;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const query = [
          contextGrowId ? `growId=${encodeURIComponent(contextGrowId)}` : "",
          contextRoomId ? `roomId=${encodeURIComponent(contextRoomId)}` : ""
        ]
          .filter(Boolean)
          .join("&");
        const res = await apiRequest(
          `${endpoints.plants(facilityId)}${query ? `?${query}` : ""}`
        );
        setItems(asArray(res));
      } catch (e) {
        handleApiError(e);
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, contextGrowId, contextRoomId, clearError, handleApiError]
  );

  async function addPlant() {
    if (!facilityId || !canWritePlants || !plantName.trim() || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setFeedback("");
    try {
      clearError();
      await createPlant(facilityId, {
        name: plantName.trim(),
        tag: plantTag.trim() || undefined,
        strain: plantStrain.trim() || undefined,
        stage: plantStage,
        roomId: roomId.trim() || undefined,
        growId: growId.trim() || undefined
      });
      setPlantName("");
      setPlantTag("");
      setPlantStrain("");
      setRoomId(contextRoomId);
      setGrowId(contextGrowId);
      setFeedback("Plant created.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  useEffect(() => {
    if (contextRoomId) setRoomId(contextRoomId);
    if (contextGrowId) setGrowId(contextGrowId);
  }, [contextGrowId, contextRoomId]);

  const header = useMemo(() => {
    const n = items.length;
    return n === 1 ? "1 plant" : `${n} plants`;
  }, [items.length]);

  const activeCount = items.filter(isActivePlant).length;
  const missingRoomCount = items.filter((item) => !hasRoomLink(item)).length;
  const missingBatchCount = items.filter((item) => !hasBatchLink(item)).length;
  const availableGrows = useMemo(
    () =>
      roomId
        ? grows.filter(
            (grow) =>
              String(grow?.roomId ?? grow?.room?._id ?? grow?.room?.id ?? "") === roomId
          )
        : grows,
    [grows, roomId]
  );

  return (
    <ScreenBoundary
      title={contextName ? `${contextName} plants` : "Plants"}
      showBack
      backFallbackHref={
        contextGrowId
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
            {contextName ? `${contextName} → Plants` : "Facility Plants"}
          </Text>
          <Text style={styles.muted}>{header}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text
            accessibilityRole="header"
            aria-level={2}
            style={[styles.cardTitle, styles.summaryHeading]}
          >
            Plant coverage
          </Text>
          <View>
            <Text style={styles.summaryValue}>{activeCount}</Text>
            <Text style={styles.summaryLabel}>active plants</Text>
          </View>
          <View>
            <Text
              style={[styles.summaryValue, missingRoomCount ? styles.warnText : null]}
            >
              {missingRoomCount}
            </Text>
            <Text style={styles.summaryLabel}>missing room</Text>
          </View>
          <View>
            <Text
              style={[styles.summaryValue, missingBatchCount ? styles.warnText : null]}
            >
              {missingBatchCount}
            </Text>
            <Text style={styles.summaryLabel}>missing batch</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
            Add Plant
          </Text>
          {canWritePlants ? (
            <View style={styles.form}>
              <TextInput
                accessibilityLabel="Plant name"
                value={plantName}
                onChangeText={setPlantName}
                style={styles.input}
                placeholder="Plant name"
                placeholderTextColor={palette.textMuted}
              />
              <TextInput
                accessibilityLabel="Plant tag"
                value={plantTag}
                onChangeText={setPlantTag}
                style={styles.input}
                placeholder="Tag or label"
                placeholderTextColor={palette.textMuted}
              />
              <TextInput
                accessibilityLabel="Plant strain"
                value={plantStrain}
                onChangeText={setPlantStrain}
                style={styles.input}
                placeholder="Strain"
                placeholderTextColor={palette.textMuted}
              />
              <View
                accessibilityLabel="Plant stage"
                accessibilityRole="radiogroup"
                style={styles.pillRow}
              >
                {STAGES.map((stage) => (
                  <Pressable
                    key={stage}
                    accessibilityRole="radio"
                    accessibilityLabel={`Set plant stage to ${stage}`}
                    accessibilityState={{ checked: plantStage === stage }}
                    onPress={() => setPlantStage(stage)}
                    style={[styles.pill, plantStage === stage && styles.pillSelected]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        plantStage === stage && styles.pillTextSelected
                      ]}
                    >
                      {stage}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Room</Text>
              <View
                accessibilityLabel="Plant room"
                accessibilityRole="radiogroup"
                style={styles.pillRow}
              >
                {rooms.map((room) => {
                  const id = contextRowId(room);
                  const label = String(room?.name ?? room?.label ?? "Room");
                  if (!id) return null;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="radio"
                      accessibilityLabel={`Set plant room to ${label}`}
                      accessibilityState={{ checked: roomId === id }}
                      onPress={() => {
                        setRoomId(id);
                        if (
                          growId &&
                          !grows.some(
                            (grow) =>
                              contextRowId(grow) === growId &&
                              String(
                                grow?.roomId ?? grow?.room?._id ?? grow?.room?.id ?? ""
                              ) === id
                          )
                        ) {
                          setGrowId("");
                        }
                      }}
                      style={[styles.pill, roomId === id && styles.pillSelected]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          roomId === id && styles.pillTextSelected
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label}>Grow</Text>
              <View
                accessibilityLabel="Plant grow"
                accessibilityRole="radiogroup"
                style={styles.pillRow}
              >
                {availableGrows.map((grow) => {
                  const id = contextRowId(grow);
                  const label = String(grow?.name ?? grow?.title ?? "Grow");
                  if (!id) return null;
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="radio"
                      accessibilityLabel={`Set plant grow to ${label}`}
                      accessibilityState={{ checked: growId === id }}
                      onPress={() => setGrowId(id)}
                      style={[styles.pill, growId === id && styles.pillSelected]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          growId === id && styles.pillTextSelected
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create facility plant"
                accessibilityState={{
                  busy: saving,
                  disabled: saving || !plantName.trim()
                }}
                onPress={addPlant}
                disabled={saving || !plantName.trim()}
                style={[
                  styles.primaryBtn,
                  (saving || !plantName.trim()) && styles.disabled
                ]}
              >
                <Text style={styles.primaryText}>
                  {saving ? "Saving..." : "Create Plant"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.muted}>
              Only facility owners and managers can create plants.
            </Text>
          )}
        </View>

        {loading ? (
          <View
            accessibilityLabel="Loading facility plants"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading plants...</Text>
          </View>
        ) : null}

        <FlatList
          accessibilityLabel="Facility plants"
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
            !loading ? (
              <View style={styles.empty}>
                <Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>
                  No plants yet
                </Text>
                <Text style={styles.muted}>
                  {canWritePlants
                    ? "Create a plant above or link plants from a grow or room to start tracking room and batch coverage."
                    : "Ask a facility owner or manager to create or link plants from a grow or room to start tracking room and batch coverage."}
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
                accessibilityLabel={`Open plant ${title}`}
                accessibilityState={{ disabled: !id }}
                disabled={!id}
                onPress={() => {
                  if (!id) return;
                  router.push({ pathname: "/home/facility/plants/[id]", params: { id } });
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
                  <View style={styles.traceRow}>
                    <Text
                      style={[
                        styles.badge,
                        hasRoomLink(item) ? styles.badgeOk : styles.badgeWarn
                      ]}
                    >
                      {hasRoomLink(item) ? "room linked" : "missing room"}
                    </Text>
                    <Text
                      style={[
                        styles.badge,
                        hasBatchLink(item) ? styles.badgeOk : styles.badgeWarn
                      ]}
                    >
                      {hasBatchLink(item) ? "batch linked" : "missing batch"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.chev}>{">"}</Text>
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
      color: palette.text,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      padding: 9,
      fontWeight: "700",
      marginBottom: 10
    },
    summaryCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      backgroundColor: palette.surfaceMuted,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
      marginBottom: 12
    },
    summaryValue: { color: palette.text, fontSize: 20, fontWeight: "900" },
    summaryHeading: { width: "100%" },
    summaryLabel: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    warnText: { color: palette.warning },
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      backgroundColor: palette.surface,
      gap: 10,
      marginBottom: 12
    },
    cardTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    form: { gap: 8 },
    label: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.surface,
      color: palette.text
    },
    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pill: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 7,
      backgroundColor: palette.surface
    },
    pillSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    pillText: { fontWeight: "800", color: palette.text },
    pillTextSelected: { color: palette.accentText },
    primaryBtn: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    disabled: { opacity: 0.55 },

    loading: { paddingVertical: 18, alignItems: "center" },
    list: { paddingTop: 6, paddingBottom: 104 },

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
    traceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    badge: {
      borderRadius: 999,
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 12,
      fontWeight: "900"
    },
    badgeOk: { color: palette.success, backgroundColor: palette.surfaceStrong },
    badgeWarn: { color: palette.warning, backgroundColor: palette.surfaceStrong },
    chev: { color: palette.textMuted, fontSize: 22, opacity: 0.5, paddingLeft: 10 },

    empty: { paddingVertical: 26, alignItems: "center" },
    emptyTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 6 }
  });
