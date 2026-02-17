import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;

function pickTitle(x: AnyRec): string {
  return String(
    x?.name ?? x?.label ?? x?.tag ?? x?.strain ?? x?.cultivar ?? x?.code ?? "Plant Detail"
  );
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

export default function FacilityPlantDetail() {
  const router = useRouter();
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

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId || !id) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.plant(facilityId, String(id)));
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

  const title = useMemo(() => (item ? pickTitle(item) : "Plant Detail"), [item]);

  const keys = useMemo(() => {
    if (!item) return [];
    const preferred = [
      "id",
      "_id",
      "name",
      "label",
      "tag",
      "stage",
      "roomId",
      "roomName",
      "createdAt",
      "updatedAt"
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
            <Text style={styles.muted}>Loading plant…</Text>
          </View>
        ) : null}

        {!loading && !item ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Not found</Text>
            <Text style={styles.muted}>This plant could not be loaded.</Text>
          </View>
        ) : null}

        {item ? (
          <View style={styles.card}>
            <Text style={styles.h1}>{pickTitle(item)}</Text>
            <Text style={styles.muted}>ID: {String(id)}</Text>

            <View style={styles.kvWrap}>{keys.map((k) => renderKV(item, k))}</View>
          </View>
        ) : null}
      </ScrollView>
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

  kvWrap: { gap: 10, marginTop: 8 },
  kv: { gap: 4 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 },

  empty: { paddingVertical: 26, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" }
});
