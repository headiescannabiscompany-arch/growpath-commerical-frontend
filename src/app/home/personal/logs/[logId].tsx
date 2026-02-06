import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import BackButton from "@/components/nav/BackButton";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 8 },
  meta: { fontSize: 13, color: "#64748B", marginBottom: 16 },

  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 12
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 }
});

export default function LogDetailScreen() {
  const { logId } = useLocalSearchParams<{ logId: string }>();

  return (
    <View style={styles.container}>
      <BackButton />

      <Text style={styles.title}>Log Details</Text>
      <Text style={styles.meta}>Log ID: {logId}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Entry</Text>
        <Text>Notes, metrics, and photos will appear here.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Attachments</Text>
        <Text>Photo uploads will appear here.</Text>
      </View>
    </View>
  );
}
