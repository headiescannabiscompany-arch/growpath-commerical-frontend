import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useCampaigns } from "@/hooks/useCampaigns";

function itemId(item, idx) {
  return String(item?.id || item?._id || `campaign-${idx}`);
}

export default function CampaignsScreen() {
  const [name, setName] = useState("");
  const { data, isLoading, error, createCampaign, creating } = useCampaigns();

  const campaigns = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createCampaign({ name: trimmed, status: "draft" });
    setName("");
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Campaigns</Text>
      {error ? <Text style={styles.error}>Failed to load campaigns.</Text> : null}

      <View style={styles.row}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="New campaign name"
          style={styles.input}
        />
        <Pressable onPress={submit} style={styles.button}>
          <Text style={styles.buttonText}>{creating ? "Adding..." : "Add"}</Text>
        </Pressable>
      </View>

      <FlatList
        data={campaigns}
        keyExtractor={itemId}
        ListEmptyComponent={<Text style={styles.empty}>No campaigns yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item?.name || "Untitled Campaign"}</Text>
            <Text style={styles.meta}>{item?.status || "draft"}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
  row: { flexDirection: "row", gap: 8, marginBottom: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  button: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingHorizontal: 12,
    justifyContent: "center"
  },
  buttonText: { color: "#fff", fontWeight: "700" },
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
