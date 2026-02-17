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
import { facilityPath } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

type AnyRec = Record<string, any>;

function getId(params: Record<string, any>): string {
  const raw = params?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function renderKV(obj: AnyRec | null, key: string) {
  if (!obj) return null;
  const v = obj[key];
  if (v === undefined || v === null || v === "") return null;

  return (
    <View key={key} style={styles.kv}>
      <Text style={styles.k}>{key}</Text>
      <Text style={styles.v} selectable>
        {typeof v === "string" ? v : JSON.stringify(v)}
      </Text>
    </View>
  );
}

export default function FacilityAuditLogDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = getId(params as any);

  const { selectedId: facilityId } = useFacility();

  const apiErr: any = useApiErrorHandler();
  const resolved = useMemo(() => {
    const error = apiErr?.error ?? apiErr?.[0] ?? null;
    const handleApiError = apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {});
    const clearError = apiErr?.clearError ?? apiErr?.[2] ?? (() => {});
    return { error, handleApiError, clearError };
  }, [apiErr]);

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId || !id) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        resolved.clearError(); // Clear any existing errors
        const path = facilityPath(facilityId, `/audit-logs/${encodeURIComponent(id)}`);
        const res = await apiRequest(path, { method: "GET" });
        setItem(res ?? null);
      } catch (e) {
        resolved.handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, id, resolved]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const keys = useMemo(() => (item ? Object.keys(item).sort() : []), [item]);

  return (
    <ScreenBoundary title="Audit Log">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
          />
        }
      >
        {resolved.error ? <InlineError error={resolved.error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Audit Log</Text>
          <Text style={styles.muted}>
            facilityId: {facilityId ? String(facilityId) : "(none)"} • id:{" "}
            {id || "(missing)"}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading audit log…</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {item ? (
            <View style={styles.kvWrap}>{keys.map((k) => renderKV(item, k))}</View>
          ) : (
            <Text style={styles.muted}>
              {id ? "No audit log returned." : "Missing audit log id."}
            </Text>
          )}
        </View>

        <Text onPress={() => router.back()} style={styles.backLink}>
          ‹ Back
        </Text>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  headerRow: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7 },
  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "white"
  },
  kvWrap: { marginTop: 6 },
  kv: { gap: 4, marginBottom: 10 },
  k: { fontSize: 12, opacity: 0.7 },
  v: { fontSize: 14 },
  backLink: { fontWeight: "800", marginTop: 6 }
});
