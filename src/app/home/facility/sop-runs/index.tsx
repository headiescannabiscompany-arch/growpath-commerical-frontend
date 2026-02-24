import React, { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

type SopRunListItem = {
  id?: string;
  _id?: string;
  runId?: string;
  title?: string;
  name?: string;
  status?: string;
};
type UnknownRecord = Record<string, unknown>;

function toRunListItem(x: unknown): SopRunListItem {
  return typeof x === "object" && x !== null ? (x as SopRunListItem) : {};
}

function asArray(res: unknown): SopRunListItem[] {
  const r = (res ?? {}) as UnknownRecord;
  if (Array.isArray(res)) return res.map(toRunListItem);
  if (Array.isArray(r.items)) return r.items.map(toRunListItem);
  if (Array.isArray(r.data)) return r.data.map(toRunListItem);
  if (Array.isArray(r.runs)) return r.runs.map(toRunListItem);
  if (Array.isArray(r.sopRuns)) return r.sopRuns.map(toRunListItem);
  return [];
}

function pickId(x: SopRunListItem, idx: number) {
  return String(x?.id ?? x?._id ?? x?.runId ?? `run-${idx}`);
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilitySopRunsIndexRoute() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const [items, setItems] = useState<SopRunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    if (!facilityId) return;
    if (opts?.refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(endpoints.sopRuns(facilityId));
      setItems(asArray(res));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load SOP runs"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [facilityId]);

  useEffect(() => {
    if (!facilityId) return;
    void load();
  }, [facilityId, load]);

  if (!facilityId) {
    return <View style={styles.center}><Text>Select a facility first.</Text></View>;
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <FlatList
      style={styles.list}
      data={items}
      keyExtractor={pickId}
      onRefresh={() => load({ refresh: true })}
      refreshing={refreshing}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.h1}>SOP Runs</Text>
          <View style={styles.links}>
            <Link href="/home/facility/sop-runs/start" style={styles.link}>Start Run</Link>
            <Link href="/home/facility/sop-runs/presets" style={styles.link}>Presets</Link>
            <Link href="/home/facility/sop-runs/compare" style={styles.link}>Compare</Link>
          </View>
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No SOP runs found.</Text>}
      renderItem={({ item, index }) => {
        const id = pickId(item, index);
        return (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/home/facility/sop-runs/[id]", params: { id } })
            }
            style={styles.card}
          >
            <Text style={styles.title}>{String(item?.title || item?.name || "SOP Run")}</Text>
            <Text style={styles.sub}>status: {String(item?.status || "unknown")}</Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 10, gap: 8 },
  h1: { fontSize: 22, fontWeight: "900" },
  links: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  link: { color: "#2563eb", fontWeight: "800" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 10
  },
  title: { fontWeight: "800" },
  sub: { opacity: 0.75 },
  empty: { opacity: 0.7 },
  err: { color: "#b91c1c", fontWeight: "700" }
});
