import React, { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";

import { useFacility } from "@/state/useFacility";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { InlineError } from "@/components/InlineError";

// SOP Run type
// _id, sopTemplateTitleSnapshot, sopTemplateId, status, createdAt, completedAt
function normalizeRuns(res: any) {
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.runs)) return res.runs;
  if (Array.isArray(res)) return res;
  return [];
}

function formatDate(x?: string) {
  if (!x) return "";
  const t = new Date(x).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(x).toLocaleString();
}

export default function FacilitySOPRunsScreen({ navigation }: any) {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

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

  const sorted = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      // active first, then newest createdAt
      const sa = String(a.status || "active");
      const sb = String(b.status || "active");
      const rank = (s: string) => (s === "active" ? 0 : s === "completed" ? 1 : 2);

      const r = rank(sa) - rank(sb);
      if (r !== 0) return r;

      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    return copy;
  }, [items]);

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
        <Text style={{ fontSize: 20, fontWeight: "800" }}>SOP Runs</Text>
        <TouchableOpacity onPress={load}>
          <Text style={{ fontWeight: "700" }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <InlineError error={error} />

      {sorted.length === 0 ? (
        <Text>No SOP runs yet</Text>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(i) => String(i._id)}
          renderItem={({ item }) => {
            const title =
              item.sopTemplateTitleSnapshot || item.sopTemplateId || "SOP Run";

            const status = String(item.status || "active");

            const subtitle =
              status === "completed"
                ? `Completed · ${formatDate(item.completedAt)}`
                : `Created · ${formatDate(item.createdAt)}`;

            return (
              <TouchableOpacity
                onPress={() => navigation.navigate("SOPRunDetail", { id: item._id })}
              >
                <View
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "#e5e7eb"
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>{title}</Text>
                  <Text style={{ opacity: 0.75 }}>
                    {status.toUpperCase()} · {subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
