import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import { endpoints } from "@/api/endpoints";
import { useFacility } from "@/state/useFacility";

type SopRunListItem = {
  id?: string;
  _id?: string;
  runId?: string;
  title?: string;
  name?: string;
};
type UnknownRecord = Record<string, unknown>;

function toRunListItem(x: unknown): SopRunListItem {
  return typeof x === "object" && x !== null ? (x as SopRunListItem) : {};
}

function asArray(res: unknown): SopRunListItem[] {
  const r = (res ?? {}) as UnknownRecord;
  if (Array.isArray(res)) return res.map(toRunListItem);
  if (Array.isArray(r.items)) return r.items.map(toRunListItem);
  if (Array.isArray(r.runs)) return r.runs.map(toRunListItem);
  if (Array.isArray(r.data)) return r.data.map(toRunListItem);
  return [];
}

function pickId(x: SopRunListItem, idx: number) {
  return String(x?.id ?? x?._id ?? x?.runId ?? `run-${idx}`);
}

function getErrorMessage(e: unknown, fallback: string) {
  return normalizeApiError(e).message || fallback;
}

export default function FacilitySopRunsCompareRoute() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const [runs, setRuns] = useState<SopRunListItem[]>([]);
  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) {
      setRuns([]);
      setError("Select a facility first.");
      return;
    }
    setError(null);
    try {
      const res = await apiRequest(endpoints.sopRuns(facilityId));
      setRuns(asArray(res));
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load runs for comparison"));
    }
  }, [facilityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const go = () => {
    if (!leftId.trim() || !rightId.trim()) return;
    router.push({
      pathname: "/home/facility/sop-runs/compare-result",
      params: { leftId: leftId.trim(), rightId: rightId.trim() }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Compare SOP Runs</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <TextInput style={styles.input} placeholder="Left run ID" value={leftId} onChangeText={setLeftId} />
      <TextInput style={styles.input} placeholder="Right run ID" value={rightId} onChangeText={setRightId} />
      <Pressable onPress={go} style={styles.btn}><Text style={styles.btnText}>Compare</Text></Pressable>

      <FlatList
        data={runs}
        keyExtractor={pickId}
        renderItem={({ item, index }) => {
          const id = pickId(item, index);
          return (
            <View style={styles.card}>
              <Text style={styles.title}>{String(item?.title || item?.name || "SOP Run")}</Text>
              <Text style={styles.sub}>id: {id}</Text>
              <View style={styles.row}>
                <Pressable onPress={() => setLeftId(id)}><Text style={styles.link}>Set Left</Text></Pressable>
                <Pressable onPress={() => setRightId(id)}><Text style={styles.link}>Set Right</Text></Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  h1: { fontSize: 22, fontWeight: "900" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, backgroundColor: "#fff" },
  btn: { backgroundColor: "#2563eb", borderRadius: 10, padding: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
  card: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10, marginTop: 10, backgroundColor: "#fff" },
  title: { fontWeight: "800" },
  sub: { opacity: 0.75 },
  row: { flexDirection: "row", gap: 12, marginTop: 6 },
  link: { color: "#2563eb", fontWeight: "800" },
  err: { color: "#b91c1c", fontWeight: "700" }
});
