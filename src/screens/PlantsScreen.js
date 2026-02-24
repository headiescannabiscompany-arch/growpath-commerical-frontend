import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { usePlants } from "@/hooks/usePlants";

function normId(item, idx) {
  return String(item?.id || item?._id || `plant-${idx}`);
}

export default function PlantsScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const { data = [], isLoading, isRefetching, refetch, error } = usePlants();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((p) => {
      const hay = `${p?.name || ""} ${p?.strain || ""} ${p?.status || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, query]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plants</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search plants"
        style={styles.search}
      />

      {error ? <Text style={styles.error}>Failed to load plants.</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={normId}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Text style={styles.empty}>No plants found.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation?.navigate?.("PlantDetail", { id: item?.id || item?._id })}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{item?.name || "Untitled Plant"}</Text>
            <Text style={styles.meta}>
              {item?.strain || "Unknown strain"} | {item?.status || "unknown"}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
  search: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff"
  },
  cardTitle: { fontWeight: "700", fontSize: 15 },
  meta: { opacity: 0.7, marginTop: 4, fontSize: 13 },
  empty: { opacity: 0.7, paddingTop: 8 },
  error: { color: "#b91c1c", marginBottom: 8 }
});
