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
import { useRouter } from "expo-router";

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
  if (Array.isArray(res?.auditLogs)) return res.auditLogs;
  return [];
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.auditId ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec): string {
  const action = x?.action ?? x?.event ?? x?.type ?? "AUDIT";
  const actor = x?.actorName ?? x?.actorEmail ?? x?.actorId ?? "";
  return actor ? `${String(action)} • ${String(actor)}` : String(action);
}

function pickSubtitle(x: AnyRec): string {
  const at = x?.createdAt ?? x?.at ?? x?.ts ?? x?.timestamp;
  const entity = x?.entity ?? x?.entityType ?? x?.collection ?? "";
  const entityId = x?.entityId ?? x?.targetId ?? x?.docId ?? "";
  const parts = [
    at ? `At: ${String(at)}` : "",
    entity ? `Entity: ${String(entity)}` : "",
    entityId ? `Id: ${String(entityId)}` : ""
  ].filter(Boolean);
  return parts.join(" • ");
}

export default function FacilityAuditLogsTab() {
  const router = useRouter();
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

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.auditLogs(facilityId), { method: "GET" });
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

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const header = useMemo(() => {
    const n = items.length;
    return n === 1 ? "1 log" : `${n} logs`;
  }, [items.length]);

  return (
    <ScreenBoundary title="Audit Logs">
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}

        <View style={styles.headerRow}>
          <Text style={styles.h1}>Audit Logs</Text>
          <Text style={styles.muted}>{header}</Text>
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
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No audit logs yet</Text>
                <Text style={styles.muted}>
                  When activity occurs, it’ll show up here.
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const id = pickId(item);
            const title = pickTitle(item);
            const subtitle = pickSubtitle(item);

            const entity = String(item?.entity ?? item?.entityType ?? "");
            const entityId = String(item?.entityId ?? item?.targetId ?? "");

            return (
              <Pressable
                onPress={() => {
                  if (!id) return;
                  router.push({
                    pathname: "/home/facility/audit-logs/[id]",
                    params: { id }
                  });
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.rowSub} numberOfLines={2}>
                      {subtitle}
                    </Text>
                  ) : null}

                  {entity && entityId ? (
                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: "/home/facility/audit-logs/[entity]/[entityId]",
                          params: { entity, entityId }
                        })
                      }
                      style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
                    >
                      <Text style={styles.linkText}>Open entity audit view ›</Text>
                    </Pressable>
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

  loading: { paddingVertical: 18, alignItems: "center" },
  list: { paddingVertical: 6 },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "white"
  },
  pressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  rowSub: { opacity: 0.7 },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 10, marginTop: 2 },

  linkBtn: { marginTop: 10, paddingVertical: 8 },
  linkText: { fontWeight: "900", opacity: 0.7 },

  empty: { paddingVertical: 26, alignItems: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "900", marginBottom: 6 }
});
