import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { InlineError } from "@/components/InlineError";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

type UiError = { title?: string; message?: string; requestId?: string };

function normalizeError(e: any): UiError {
  const env = e?.error || e;
  return {
    title: env?.code ? String(env.code) : "REQUEST_FAILED",
    message: String(env?.message || e?.message || e || "Unknown error"),
    requestId: env?.requestId ? String(env.requestId) : undefined
  };
}

function getId(x: any): string {
  return String(x?.id || x?._id || x?.auditId || "");
}

export default function AuditLogsByEntityScreen() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const params = useLocalSearchParams<{ entity?: string; entityId?: string }>();

  const entity = typeof params.entity === "string" ? params.entity : "";
  const entityId = typeof params.entityId === "string" ? params.entityId : "";

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const fetchAll = useCallback(async () => {
    if (!facilityId) return;
    setError(null);
    const raw = await apiRequest(endpoints.auditLogs(facilityId), { method: "GET" });

    const list =
      (Array.isArray(raw) && raw) ||
      (Array.isArray((raw as any)?.items) && (raw as any).items) ||
      (Array.isArray((raw as any)?.logs) && (raw as any).logs) ||
      (Array.isArray((raw as any)?.data?.items) && (raw as any).data.items) ||
      [];

    setItems(list);
  }, [facilityId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await fetchAll();
      } catch (e) {
        if (!alive) return;
        setError(normalizeError(e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchAll]);

  const onRefresh = useCallback(async () => {
    if (!facilityId) return;
    setRefreshing(true);
    try {
      await fetchAll();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setRefreshing(false);
    }
  }, [facilityId, fetchAll]);

  const filtered = useMemo(() => {
    if (!entity && !entityId) return items;
    return items.filter((x) => {
      const e = String(x?.entity || x?.entityType || "");
      const eid = String(x?.entityId || x?.targetId || x?.refId || "");
      const okEntity = entity ? e === entity : true;
      const okId = entityId ? eid === entityId : true;
      return okEntity && okId;
    });
  }, [items, entity, entityId]);

  return (
    <ScreenBoundary name="facility.auditLogs.byEntity">
      <View style={{ flex: 1, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Audit Logs</Text>
        <Text style={{ opacity: 0.85 }}>Entity: {entity || "any"}</Text>
        <Text style={{ opacity: 0.85 }}>Entity ID: {entityId || "any"}</Text>

        <InlineError
          title={error?.title}
          message={error?.message}
          requestId={error?.requestId}
        />

        {!facilityId ? (
          <TouchableOpacity
            onPress={() => router.replace("/home/facility/select")}
            style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
          >
            <Text style={{ fontWeight: "900" }}>Go to Facility Select</Text>
          </TouchableOpacity>
        ) : loading ? (
          <>
            <ActivityIndicator />
            <Text style={{ opacity: 0.75 }}>Loading…</Text>
          </>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(x, idx) => getId(x) || String(idx)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            ListEmptyComponent={
              <Text style={{ opacity: 0.75 }}>No matching audit logs.</Text>
            }
            renderItem={({ item }) => {
              const id = getId(item);
              const title = String(
                item?.action || item?.event || item?.type || "Audit Event"
              );
              const ts = String(item?.ts || item?.createdAt || "");
              return (
                <TouchableOpacity
                  onPress={() =>
                    id
                      ? router.push(`/home/facility/audit-logs/${encodeURIComponent(id)}`)
                      : undefined
                  }
                  disabled={!id}
                  style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    opacity: id ? 1 : 0.5
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>{title}</Text>
                  <Text style={{ opacity: 0.75 }}>{id || "missing id"}</Text>
                  {ts ? <Text style={{ opacity: 0.75 }}>{ts}</Text> : null}
                </TouchableOpacity>
              );
            }}
          />
        )}

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
        >
          <Text style={{ fontWeight: "900" }}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScreenBoundary>
  );
}
