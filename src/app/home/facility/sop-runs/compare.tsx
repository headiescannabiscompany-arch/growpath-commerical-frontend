import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";

import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

// Lite SOP run type
function normalizeRuns(res: any) {
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.runs)) return res.runs;
  if (Array.isArray(res)) return res;
  return [];
}

function fmt(x?: string) {
  if (!x) return "";
  const t = new Date(x).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(x).toLocaleString();
}

export default function SOPRunComparePickerScreen({ navigation }: any) {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const [runA, setRunA] = useState<string | null>(null);
  const [runB, setRunB] = useState<string | null>(null);

  const load = async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(endpoints.sopRuns(facilityId));
      setItems(normalizeRuns(res));
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [facilityId]);

  const completed = useMemo(() => {
    return items
      .filter((r) => String(r.status || "").toLowerCase() === "completed")
      .sort((a, b) => {
        const ta = new Date(a.completedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.completedAt || b.createdAt || 0).getTime();
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
      });
  }, [items]);

  const canCompare = !!runA && !!runB && runA !== runB;

  const select = (id: string) => {
    if (!runA) return setRunA(id);
    if (runA && !runB && id !== runA) return setRunB(id);
    if (runA && runB) return setRunB(id === runA ? runB : id);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", marginTop: 40 }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 12
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Compare SOP Runs</Text>
        <TouchableOpacity onPress={load}>
          <Text style={{ fontWeight: "800" }}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <InlineError error={error} />
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontWeight: "800" }}>
          Run A: {runA ? runA : "Select a completed run"}
        </Text>
        <Text style={{ fontWeight: "800", marginTop: 6 }}>
          Run B: {runB ? runB : "Select another completed run"}
        </Text>
        <TouchableOpacity
          disabled={!canCompare}
          onPress={() => navigation.navigate("SOPRunCompareResult", { runA, runB })}
          style={{
            marginTop: 10,
            paddingVertical: 12,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: canCompare ? "#111827" : "#e5e7eb"
          }}
        >
          <Text style={{ color: canCompare ? "#fff" : "#6b7280", fontWeight: "900" }}>
            Compare
          </Text>
        </TouchableOpacity>
      </View>
      {completed.length === 0 ? (
        <Text>No completed SOP runs to compare yet</Text>
      ) : (
        <FlatList
          data={completed}
          keyExtractor={(r) => String(r._id)}
          renderItem={({ item }) => {
            const id = String(item._id);
            const selected = id === runA || id === runB;
            const title =
              item.sopTemplateTitleSnapshot || item.sopTemplateId || "SOP Run";
            return (
              <TouchableOpacity onPress={() => select(id)}>
                <View
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#e5e7eb",
                    backgroundColor: selected ? "#f3f4f6" : "transparent"
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>{title}</Text>
                  <Text style={{ opacity: 0.75 }}>
                    {id} · Completed {fmt(item.completedAt)}
                  </Text>
                  <Text style={{ opacity: 0.75 }}>Created {fmt(item.createdAt)}</Text>
                  {id === runA ? (
                    <Text style={{ fontWeight: "900", marginTop: 4 }}>Selected as A</Text>
                  ) : null}
                  {id === runB ? (
                    <Text style={{ fontWeight: "900", marginTop: 4 }}>Selected as B</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
