import React, { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

export default function FacilitySopRunDetailRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { selectedId: facilityId } = useFacility();
  const [run, setRun] = useState<SopRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    if (!facilityId) {
      setMessage("Select a facility first.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<SopRunDetailResponse>(
        endpoints.sopRun(facilityId, String(id))
      );
      setRun(res?.run ?? res?.data ?? res);
      setMessage(null);
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Failed to load SOP run"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const completeRun = async () => {
    if (!facilityId || !id) return;
    setMessage(null);
    try {
      await apiRequest(endpoints.sopRunComplete(facilityId, String(id)), {
        method: "POST"
      });
      setMessage("Run marked complete.");
      await load();
    } catch (e: unknown) {
      setMessage(getErrorMessage(e, "Failed to complete run"));
    }
  };

  if (!id)
    return (
      <View style={styles.container}>
        <Text>Missing run id.</Text>
      </View>
    );
  if (loading)
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>SOP Run Detail</Text>
      <Text style={styles.sub}>runId: {String(id)}</Text>
      <Text style={styles.sub}>status: {String(run?.status || "unknown")}</Text>
      <Pressable onPress={completeRun} style={styles.btn}>
        <Text style={styles.btnText}>Mark Complete</Text>
      </Pressable>
      {message ? <Text style={styles.msg}>{message}</Text> : null}
      <View style={styles.card}>
        <Text selectable style={styles.json}>
          {JSON.stringify(run, null, 2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75 },
  btn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    padding: 10,
    alignItems: "center"
  },
  btnText: { color: "#fff", fontWeight: "800" },
  msg: { fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff"
  },
  json: { fontFamily: "monospace", fontSize: 12 }
});
