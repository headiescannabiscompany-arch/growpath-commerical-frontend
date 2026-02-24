import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

type SopRunDetail = {
  status?: string;
  completedAt?: string | null;
} & Record<string, unknown>;
type SopRunDetailResponse = { run?: SopRunDetail; data?: SopRunDetail } & SopRunDetail;

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilitySopRunsCompareResultRoute() {
  const params = useLocalSearchParams<{
    leftId?: string | string[];
    rightId?: string | string[];
  }>();
  const leftId = Array.isArray(params.leftId) ? params.leftId[0] : params.leftId;
  const rightId = Array.isArray(params.rightId) ? params.rightId[0] : params.rightId;
  const { selectedId: facilityId } = useFacility();
  const [left, setLeft] = useState<SopRunDetail | null>(null);
  const [right, setRight] = useState<SopRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!leftId || !rightId) {
        setError("Both run IDs are required.");
        return;
      }
      if (!facilityId) {
        setError("Select a facility first.");
        return;
      }
      setError(null);
      try {
        const [a, b] = await Promise.all([
          apiRequest<SopRunDetailResponse>(endpoints.sopRun(facilityId, String(leftId))),
          apiRequest<SopRunDetailResponse>(endpoints.sopRun(facilityId, String(rightId)))
        ]);
        setLeft(a?.run ?? a?.data ?? a);
        setRight(b?.run ?? b?.data ?? b);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to compare runs"));
      }
    };
    void run();
  }, [facilityId, leftId, rightId]);

  const summary = useMemo(() => {
    return {
      leftStatus: String(left?.status || "unknown"),
      rightStatus: String(right?.status || "unknown"),
      leftCompletedAt: left?.completedAt ?? null,
      rightCompletedAt: right?.completedAt ?? null
    };
  }, [left, right]);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>SOP Compare Result</Text>
      <Text style={styles.sub}>left: {String(leftId || "")}</Text>
      <Text style={styles.sub}>right: {String(rightId || "")}</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}

      <View style={styles.card}>
        <Text selectable style={styles.json}>
          {JSON.stringify(summary, null, 2)}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Left run</Text>
        <Text selectable style={styles.json}>
          {JSON.stringify(left, null, 2)}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Right run</Text>
        <Text selectable style={styles.json}>
          {JSON.stringify(right, null, 2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75 },
  err: { color: "#b91c1c", fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff"
  },
  title: { fontWeight: "800" },
  json: { fontFamily: "monospace", fontSize: 12 }
});
