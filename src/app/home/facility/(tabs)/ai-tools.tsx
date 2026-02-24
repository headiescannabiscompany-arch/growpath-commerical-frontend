import React from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function FacilityAiToolsRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>AI Tools</Text>
      <Text style={styles.sub}>Run assisted analysis with facility context.</Text>

      <View style={styles.card}>
        <Text style={styles.title}>Ask AI</Text>
        <Text style={styles.desc}>Run a structured tool/function call.</Text>
        <Link href="/home/facility/ai/ask" style={styles.link}>
          Open
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Trichome Analysis</Text>
        <Text style={styles.desc}>Analyze photos and estimate harvest readiness.</Text>
        <Link href="/home/facility/ai/diagnosis-photo" style={styles.link}>
          Open
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>AI Templates</Text>
        <Text style={styles.desc}>Use prebuilt AI workflows for common tasks.</Text>
        <Link href="/home/facility/ai/template" style={styles.link}>
          Open
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75, marginBottom: 6 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    gap: 6
  },
  title: { fontSize: 16, fontWeight: "800" },
  desc: { opacity: 0.75 },
  link: { fontWeight: "800", color: "#2563eb" }
});
