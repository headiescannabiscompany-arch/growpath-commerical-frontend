import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";

import { useFacility } from "@/state/useFacility";
import { InlineError } from "@/components/InlineError";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import {
  listWeeklyReports,
  deleteWeeklyReport,
  type SavedWeeklyReport
} from "@/utils/weeklyReportsStore";

export default function WeeklyReportsListScreen({ navigation }: any) {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [items, setItems] = useState<SavedWeeklyReport[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listWeeklyReports(facilityId);
      setItems(res);
    } catch (e) {
      setError(handleApiError(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [facilityId]);

  const onDelete = async (id: string) => {
    if (!facilityId) return;
    setDeletingId(id);
    setError(null);
    try {
      const next = await deleteWeeklyReport(facilityId, id);
      setItems(next);
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setDeletingId(null);
    }
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
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Saved Weekly Reports</Text>
        <TouchableOpacity onPress={load}>
          <Text style={{ fontWeight: "800" }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <InlineError error={error} />

      {items.length === 0 ? (
        <Text>No saved reports yet</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => String(x.id)}
          renderItem={({ item }) => {
            const busy = deletingId === item.id;
            return (
              <View
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e5e7eb"
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate("WeeklyReportDetail", { id: item.id })
                  }
                  disabled={busy}
                >
                  <Text style={{ fontWeight: "900" }}>{item.title}</Text>
                  <Text style={{ opacity: 0.75 }}>
                    Period: {new Date(item.periodStart).toLocaleDateString()} →{" "}
                    {new Date(item.periodEnd).toLocaleDateString()}
                  </Text>
                  <Text style={{ opacity: 0.6, marginTop: 4 }}>
                    Saved: {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onDelete(String(item.id))}
                  disabled={busy}
                  style={{ marginTop: 10 }}
                >
                  <Text
                    style={{
                      fontWeight: "900",
                      color: "#ef4444",
                      opacity: busy ? 0.6 : 1
                    }}
                  >
                    {busy ? "Deleting..." : "Delete"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
