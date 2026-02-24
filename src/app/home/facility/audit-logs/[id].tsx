import React, { useMemo } from "react";
import { Link, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

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
  message?: string;
};

function pickId(x: AuditLogItem) {
  return String(x?.id ?? x?._id ?? x?.logId ?? "");
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilityAuditLogDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { selectedId } = useFacility();
  const { logs, isLoading, error } = useAuditLogs(selectedId);

  const item = useMemo(() => {
    if (!id || !Array.isArray(logs)) return null;
    const typed = logs as AuditLogItem[];
    return typed.find((x) => pickId(x) === String(id)) ?? null;
  }, [id, logs]);

  const entity = String(item?.entity ?? item?.entityType ?? "");
  const entityId = String(item?.entityId ?? item?.targetId ?? "");

  if (isLoading) return <View style={styles.container}><Text>Loading audit log...</Text></View>;
  if (!selectedId) return <View style={styles.container}><Text>Select a facility first.</Text></View>;
  if (!id) return <View style={styles.container}><Text>Missing audit log id.</Text></View>;
  if (error) return <View style={styles.container}><Text>{getErrorMessage(error, "Failed to load audit log detail.")}</Text></View>;
  if (!item) return <View style={styles.container}><Text>Audit log not found.</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Audit Log Detail</Text>
      <Text style={styles.sub}>id: {String(id || "")}</Text>
      {entity && entityId ? (
        <Link
          href={{ pathname: "/home/facility/audit-logs/[entity]/[entityId]", params: { entity, entityId } }}
          style={styles.link}
        >
          View all for this entity
        </Link>
      ) : null}
      <View style={styles.card}>
        <Text selectable style={styles.json}>{JSON.stringify(item, null, 2)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75 },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 12, padding: 10, backgroundColor: "#fff" },
  json: { fontFamily: "monospace", fontSize: 12 },
  link: { color: "#2563eb", fontWeight: "700" }
});
