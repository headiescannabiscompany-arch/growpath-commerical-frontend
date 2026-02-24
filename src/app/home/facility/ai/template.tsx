import React from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function FacilityAiTemplateRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>AI Templates</Text>
      <Text style={styles.sub}>
        Use predefined workflows for common facility decisions.
      </Text>

      <View style={styles.card}>
        <Text style={styles.title}>Harvest Window</Text>
        <Text style={styles.desc}>
          Estimate harvest window from trichome distribution.
        </Text>
        <Link href="/home/facility/ai/ask" style={styles.link}>
          Run Template
        </Link>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Photo Diagnosis</Text>
        <Text style={styles.desc}>Analyze trichome imagery and capture context.</Text>
        <Link href="/home/facility/ai/diagnosis-photo" style={styles.link}>
          Run Template
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  h1: { fontSize: 22, fontWeight: "900" },
  sub: { opacity: 0.75 },
  card: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    padding: 12,
    gap: 6,
    backgroundColor: "#fff"
  },
  title: { fontSize: 16, fontWeight: "800" },
  desc: { opacity: 0.75 },
  link: { fontWeight: "800", color: "#2563eb" }
});
