import React, { useCallback, useEffect, useState } from "react";
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

import { listPersonalGrows } from "@/api/grows";

function normId(item, idx) {
  return String(item?._id || item?.id || `grow-${idx}`);
}

export default function GrowsScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await listPersonalGrows();
      setItems(Array.isArray(res) ? res : []);
    } catch (e) {
      setError(String(e?.message || e || "Failed to load grows"));
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((g) => {
    const hay = `${g?.name || ""} ${g?.strain || ""} ${g?.status || ""}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grows</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search grows"
        style={styles.search}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={normId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No grows found.</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation?.navigate?.("GrowLog", { growId: item?._id || item?.id })}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{item?.name || "Untitled Grow"}</Text>
            <Text style={styles.meta}>
              {item?.strain || "Unknown strain"} | {item?.status || "active"}
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
