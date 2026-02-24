import React, { useMemo } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { normalizeApiError } from "@/api/errors";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useFacility } from "@/state/useFacility";
import type { AuditLog } from "@/types/contracts";

type AuditLogItem = AuditLog & {
  id?: string;
  _id?: string;
  logId?: string;
  entity?: string;
  entityType?: string;
  entityId?: string;
  targetId?: string;
  type?: string;
  message?: string;
};

function pickId(x: AuditLogItem, idx: number) {
  return String(x?.id ?? x?._id ?? x?.logId ?? `audit-${idx}`);
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilityAuditLogEntityRoute() {
  const params = useLocalSearchParams<{
    entity?: string | string[];
    entityId?: string | string[];
  }>();
  const entity = String(
    Array.isArray(params.entity) ? params.entity[0] : params.entity || ""
  );
  const entityId = String(
    Array.isArray(params.entityId) ? params.entityId[0] : params.entityId || ""
  );
  const { selectedId } = useFacility();
  const { logs, isLoading, error } = useAuditLogs(selectedId);

  const filtered = useMemo(() => {
    if (!Array.isArray(logs)) return [];
    const typed = logs as AuditLogItem[];
    const a = entity.toLowerCase();
    const b = entityId.toLowerCase();
    return typed.filter((x) => {
      const xEntity = String(x?.entity ?? x?.entityType ?? "").toLowerCase();
      const xEntityId = String(x?.entityId ?? x?.targetId ?? "").toLowerCase();
      return xEntity === a && xEntityId === b;
    });
  }, [logs, entity, entityId]);

  if (isLoading)
    return (
      <View style={styles.container}>
        <Text>Loading audit logs...</Text>
      </View>
    );
  if (!selectedId)
    return (
      <View style={styles.container}>
        <Text>Select a facility first.</Text>
      </View>
    );
  if (!entity || !entityId)
    return (
      <View style={styles.container}>
        <Text>Missing entity route params.</Text>
      </View>
    );
  if (error)
    return (
      <View style={styles.container}>
        <Text>{getErrorMessage(error, "Failed to load audit logs.")}</Text>
      </View>
    );

  return (
    <FlatList
      style={styles.list}
      data={filtered}
      keyExtractor={pickId}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.h1}>Audit Logs for Entity</Text>
          <Text style={styles.sub}>entity: {entity}</Text>
          <Text style={styles.sub}>entityId: {entityId}</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.sub}>No matching audit logs.</Text>}
      renderItem={({ item, index }) => {
        const id = pickId(item, index);
        return (
          <View style={styles.card}>
            <Text style={styles.title}>
              {String(item?.action || item?.type || "Event")}
            </Text>
            <Text style={styles.sub}>{String(item?.details || item?.message || "")}</Text>
            <Link
              href={{ pathname: "/home/facility/audit-logs/[id]", params: { id } }}
              style={styles.link}
            >
              Open Detail
            </Link>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, padding: 16 },
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 10 },
  h1: { fontSize: 22, fontWeight: "900" },
  title: { fontWeight: "800" },
  sub: { opacity: 0.75 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    gap: 4
  },
  link: { color: "#2563eb", fontWeight: "700" }
});
