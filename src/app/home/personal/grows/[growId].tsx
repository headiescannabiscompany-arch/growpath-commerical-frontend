import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams, Link } from "expo-router";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff"
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8
  },
  meta: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 16
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6
  },
  link: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#16A34A"
  }
});

export default function GrowDetailScreen() {
  const { growId } = useLocalSearchParams<{ growId: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grow Details</Text>
      <Text style={styles.meta}>Grow ID: {growId}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Overview</Text>
        <Text>Stats, stages, and recent activity will appear here.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Plants</Text>
        <Text>Plant list will appear here.</Text>
      </View>

      <Link href="/home/personal/grows" style={styles.link}>
        Back to Grows →
      </Link>
    </View>
  );
}
