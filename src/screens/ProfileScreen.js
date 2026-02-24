import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";

export default function ProfileScreen() {
  const { user, mode } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name || user?.displayName || "Unknown"}</Text>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{user?.email || "No email"}</Text>
        <Text style={styles.label}>Mode</Text>
        <Text style={styles.value}>{String(mode || "unknown")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    gap: 6
  },
  label: { fontSize: 12, opacity: 0.65 },
  value: { fontSize: 15, fontWeight: "600" }
});
