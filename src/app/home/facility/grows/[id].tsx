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

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import FacilityContextualTools from "@/components/facility/FacilityContextualTools";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

function unwrapGrow(res: any): AnyRec | null {
  const row =
    res?.grow ?? res?.item ?? res?.data?.grow ?? res?.data?.item ?? res?.data ?? res;
  return row && typeof row === "object" && !Array.isArray(row) ? row : null;
}

function pickTitle(x: AnyRec): string {
  return String(x?.name ?? x?.title ?? x?.strain ?? x?.label ?? "Grow Detail");
}

function renderKV(obj: AnyRec, key: string) {
  const value = obj?.[key];
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={styles.kv} key={key}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v}>
        {typeof value === "string" ? value : JSON.stringify(value)}
      </Text>
    </View>
  );
}

export default function FacilityGrowDetail() {
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
        const res = await apiRequest(endpoints.grow(facilityId, String(id)));
        setItem(unwrapGrow(res));
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearError, facilityId, handleApiError, id]
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

  const title = useMemo(() => (item ? pickTitle(item) : "Grow Detail"), [item]);

  const keys = useMemo(() => {
    if (!item) return [];
    const preferred = [
      "id",
      "_id",
      "name",
      "title",
      "strain",
      "phase",
      "stage",
      "status",
      "roomId",
      "roomName",
      "startedAt",
      "startDate",
      "createdAt",
      "updatedAt"
    ];
    const rest = Object.keys(item)
      .filter((key) => !preferred.includes(key))
      .sort();
    return [...preferred.filter((key) => key in item), ...rest];
  }, [item]);

  return (
    <ScreenBoundary title={title} showBack backFallbackHref="/home/facility/grows">
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
            <Text style={styles.muted}>Loading grow...</Text>
          </View>
        ) : null}

        {!loading && !item ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Not found</Text>
            <Text style={styles.muted}>This grow could not be loaded.</Text>
          </View>
        ) : null}

        {item ? (
          <>
            <FacilityContextualTools
              title="Grow tools"
              tools={[
                "ask-ai",
                "diagnose",
                "environment",
                "recipe-builder",
                "harvest-readiness",
                "reports"
              ]}
              source="facility-grow-detail"
              facilityId={facilityId ?? undefined}
              growId={String(id)}
              roomId={String(item.roomId ?? "")}
              prompt={`Review ${pickTitle(item)} and recommend the next facility action.`}
            />
            <View style={styles.card}>
              <Text style={styles.h1}>{pickTitle(item)}</Text>
              <Text style={styles.muted}>ID: {String(id)}</Text>
              <View style={styles.kvWrap}>{keys.map((key) => renderKV(item, key))}</View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 16 },
  loading: { alignItems: "center", gap: 10, paddingVertical: 18 },
  muted: { opacity: 0.7 },
  card: {
    backgroundColor: "white",
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  h1: { fontSize: 18, fontWeight: "900" },
  kvWrap: { gap: 10, marginTop: 8 },
  kv: { gap: 4 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 26 },
  emptyTitle: { fontSize: 16, fontWeight: "800" }
});
