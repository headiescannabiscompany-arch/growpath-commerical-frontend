import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.logs)) return res.logs;
  if (Array.isArray(res?.auditLogs)) return res.auditLogs;
  return [];
}

function getParam(params: Record<string, any>, key: string): string {
  const raw = params?.[key];
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw ?? "");
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.auditLogId ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec): string {
  const action = x?.action ?? x?.event ?? x?.type ?? "Audit Event";
  const at = x?.createdAt ?? x?.at ?? x?.timestamp ?? "";
  return at ? `${String(action)} • ${String(at)}` : String(action);
}

export default function FacilityAuditLogsByEntityRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const entity = getParam(params as any, "entity");
  const entityId = getParam(params as any, "entityId");

  const { selectedId: facilityId } = useFacility();

  const apiErr: any = useApiErrorHandler();
  const resolved = useMemo(() => {
    const error = apiErr?.error ?? apiErr?.[0] ?? null;
    const handleApiError = apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {});
    const clearError = apiErr?.clearError ?? apiErr?.[2] ?? (() => {});
    return { error, handleApiError, clearError };
  }, [apiErr]);

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        resolved.clearError();

        // Most backends support filtering audit logs by query params.
        const base = endpoints.auditLogs(facilityId);
        const qs =
          entity && entityId
            ? `?entity=${encodeURIComponent(entity)}&entityId=${encodeURIComponent(entityId)}`
            : "";
        const res = await apiRequest(`${base}${qs}`, { method: "GET" });

        setItems(asArray(res));
      } catch (e) {
        resolved.handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [entity, entityId, facilityId, resolved]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  return (
    <ScreenBoundary title="Audit Logs">
      <View style={styles.container}>
        {resolved.error ? <InlineError error={resolved.error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Audit Logs</Text>
          <Text style={styles.muted}>
            {entity ? String(entity) : "(entity)"} •{" "}
            {entityId ? String(entityId) : "(id)"}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading audit logs…</Text>
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
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No audit logs</Text>
                <Text style={styles.muted}>No events found for this entity.</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const id = pickId(item);
            return (
              <Pressable
                onPress={() => {
                  if (!id) return;
                  router.push({
                    pathname: "/home/facility/audit-logs/[id]",
                    params: { id }
                  });
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {pickTitle(item)}
                  </Text>
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
  container: { flex: 1, padding: 16, gap: 12 },
  headerRow: { gap: 4 },
  h1: { fontSize: 22, fontWeight: "900" },
  muted: { opacity: 0.7 },
  loading: { paddingVertical: 18, alignItems: "center", gap: 10 },
  list: { paddingVertical: 6, gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  rowPressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "800" },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 8 },
  empty: { paddingVertical: 26, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "800" }
});
