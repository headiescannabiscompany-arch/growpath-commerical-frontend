import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link } from "expo-router";

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B" },

  grid: { gap: 12 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#F8FAFC"
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  cardDesc: { fontSize: 14, color: "#475569" },
  link: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#16A34A" }
});

export default function ToolsHubScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.subtitle}>
          Calculators and helpers to support better grow decisions.
        </Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌡️ VPD Calculator</Text>
          <Text style={styles.cardDesc}>Estimate VPD from temperature and humidity.</Text>
          <Link href="/home/personal/tools/vpd" style={styles.link} asChild>
            <Text>Open VPD {"\u2192"}</Text>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🧪 NPK Helper</Text>
          <Text style={styles.cardDesc}>
            Calculate ratios and dilution targets from N-P-K values.
          </Text>
          <Link href="/home/personal/tools/npk" style={styles.link} asChild>
            <Text>Open NPK {"\u2192"}</Text>
          </Link>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💧 Watering Tracker</Text>
          <Text style={styles.cardDesc}>
            Plan watering cadence and next watering date.
          </Text>
          <Link href="/home/personal/tools/watering" style={styles.link} asChild>
            <Text>Open Watering {"\u2192"}</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}
