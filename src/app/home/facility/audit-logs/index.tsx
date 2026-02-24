import React, { useMemo } from "react";
import { Link } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { normalizeApiError } from "@/api/errors";
import { useFacility } from "@/state/useFacility";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import type { AuditLog } from "@/types/contracts";

type AuditLogListItem = AuditLog & {
  id?: string;
  _id?: string;
  logId?: string;
  type?: string;
  message?: string;
};

function pickId(x: AuditLogListItem, idx: number) {
  return String(x?.id || x?._id || x?.logId || `audit-${idx}`);
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilityAuditLogsIndexRoute() {
  const { selectedId } = useFacility();
  const { logs, isLoading, isRefreshing, error, refetch } = useAuditLogs(selectedId);
  const items = useMemo(
    () => (Array.isArray(logs) ? (logs as AuditLogListItem[]) : []),
    [logs]
  );

  if (!selectedId)
    return (
      <View style={styles.container}>
        <Text>Select a facility first.</Text>
      </View>
    );
  if (isLoading)
    return (
      <View style={styles.container}>
        <Text>Loading audit logs...</Text>
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
      onRefresh={() => {
        void refetch();
      }}
      refreshing={Boolean(isRefreshing)}
      data={items}
      keyExtractor={pickId}
      ListHeaderComponent={<Text style={styles.h1}>Audit Logs</Text>}
      ListEmptyComponent={<Text style={styles.empty}>No audit logs yet.</Text>}
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
  container: { flex: 1, padding: 16, justifyContent: "center" },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff",
    gap: 4
  },
  title: { fontWeight: "800" },
  sub: { opacity: 0.75 },
  link: { color: "#2563eb", fontWeight: "700" },
  empty: { opacity: 0.7 }
});
