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
import { useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { createPlant } from "@/api/plants";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useEntitlements } from "@/entitlements";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";

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

function canCreatePlant(role: unknown) {
  return role === "OWNER" || role === "MANAGER" || role === "STAFF";
}

export default function FacilityPlantsTab() {
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
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  const [plantName, setPlantName] = useState("");
  const [plantTag, setPlantTag] = useState("");
  const [plantStrain, setPlantStrain] = useState("");
  const [plantStage, setPlantStage] = useState("Veg");
  const [roomId, setRoomId] = useState("");
  const [growId, setGrowId] = useState("");

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.plants(facilityId));
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

  async function addPlant() {
    if (!facilityId || !canCreatePlant(ent?.facilityRole) || !plantName.trim()) return;
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
      setRoomId("");
      setGrowId("");
      setFeedback("Plant created.");
      await load({ refresh: true });
    } catch (e) {
      handleApiError(e);
    } finally {
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

  const header = useMemo(() => {
    const n = items.length;
    return n === 1 ? "1 plant" : `${n} plants`;
  }, [items.length]);

  const activeCount = items.filter(isActivePlant).length;
  const missingRoomCount = items.filter((item) => !hasRoomLink(item)).length;
  const missingBatchCount = items.filter((item) => !hasBatchLink(item)).length;

  return (
    <ScreenBoundary title="Plants">
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Facility Plants</Text>
          <Text style={styles.muted}>{header}</Text>
        </View>

        <View style={styles.summaryCard}>
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
          <Text style={styles.cardTitle}>Add Plant</Text>
          {canCreatePlant(ent?.facilityRole) ? (
            <View style={styles.form}>
              <TextInput
                accessibilityLabel="Plant name"
                value={plantName}
                onChangeText={setPlantName}
                style={styles.input}
                placeholder="Plant name"
              />
              <TextInput
                accessibilityLabel="Plant tag"
                value={plantTag}
                onChangeText={setPlantTag}
                style={styles.input}
                placeholder="Tag or label"
              />
              <TextInput
                accessibilityLabel="Plant strain"
                value={plantStrain}
                onChangeText={setPlantStrain}
                style={styles.input}
                placeholder="Strain"
              />
              <View style={styles.pillRow}>
                {STAGES.map((stage) => (
                  <Pressable
                    key={stage}
                    accessibilityRole="button"
                    accessibilityLabel={`Set plant stage to ${stage}`}
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
              <TextInput
                accessibilityLabel="Plant room id"
                value={roomId}
                onChangeText={setRoomId}
                style={styles.input}
                placeholder="Room ID, optional"
              />
              <TextInput
                accessibilityLabel="Plant grow id"
                value={growId}
                onChangeText={setGrowId}
                style={styles.input}
                placeholder="Grow or batch link, optional"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create facility plant"
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
            <Text style={styles.muted}>Only facility staff can create plants.</Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading plants...</Text>
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
                <Text style={styles.emptyTitle}>No plants yet</Text>
                <Text style={styles.muted}>
                  When plants exist on the backend, they'll show up here.
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
                accessibilityRole="button"
                accessibilityLabel={`Open plant ${title}`}
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { opacity: 0.7 },
  feedback: {
    color: "#334155",
    backgroundColor: "#F1F5F9",
    borderRadius: 9,
    padding: 9,
    fontWeight: "700",
    marginBottom: 10
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#dbeafe",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#eff6ff",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 12
  },
  summaryValue: { color: "#1e3a8a", fontSize: 20, fontWeight: "900" },
  summaryLabel: { color: "#1e40af", fontSize: 12, fontWeight: "800" },
  warnText: { color: "#b45309" },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white",
    gap: 10,
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  form: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white"
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.14)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "white"
  },
  pillSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  pillText: { fontWeight: "800", color: "#0F172A" },
  pillTextSelected: { color: "white" },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryText: { color: "white", fontWeight: "800" },
  disabled: { opacity: 0.55 },

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
  pressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  rowSub: { opacity: 0.7 },
  traceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  badge: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: "900"
  },
  badgeOk: { color: "#065f46", backgroundColor: "#d1fae5" },
  badgeWarn: { color: "#92400e", backgroundColor: "#fef3c7" },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 10 },

  empty: { paddingVertical: 26, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", marginBottom: 6 }
});
