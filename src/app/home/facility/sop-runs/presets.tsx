import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";

import { useFacility } from "@/state/useFacility";
import { InlineError } from "@/components/InlineError";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

import {
  listComparisonPresets,
  deleteComparisonPreset,
  type ComparisonPreset
} from "@/utils/comparisonPresets";

export default function SOPRunComparePresetsScreen({ navigation }: any) {
  const { selectedId: facilityId } = useFacility();
  const handleApiError = useApiErrorHandler();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [items, setItems] = useState<ComparisonPreset[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await listComparisonPresets(facilityId);
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(handleApiError(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, handleApiError]);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (presetId: string) => {
    if (!facilityId) return;
    setDeletingId(presetId);
    setError(null);

    try {
      const next = await deleteComparisonPreset(facilityId, presetId);
      setItems(next);
    } catch (e) {
      setError(handleApiError(e));
    } finally {
      setDeletingId(null);
    }
  };

  const openPreset = (p: ComparisonPreset) => {
    navigation.navigate("SOPRunCompareResult", { runA: p.runA, runB: p.runB });
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
        <Text style={{ fontSize: 20, fontWeight: "900" }}>Comparison Presets</Text>
        <TouchableOpacity onPress={load}>
          <Text style={{ fontWeight: "800" }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <InlineError error={error} />

      {items.length === 0 ? (
        <Text>No saved presets yet</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
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
                <TouchableOpacity onPress={() => openPreset(item)} disabled={busy}>
                  <Text style={{ fontWeight: "900" }}>{item.label}</Text>
                  <Text style={{ opacity: 0.75 }}>A: {item.runA}</Text>
                  <Text style={{ opacity: 0.75 }}>B: {item.runB}</Text>
                  <Text style={{ opacity: 0.6, marginTop: 4 }}>
                    Saved:{" "}
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
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
                    {busy ? "Deleting..." : "Delete preset"}
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
