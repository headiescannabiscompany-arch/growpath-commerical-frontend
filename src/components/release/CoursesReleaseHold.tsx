import React from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import BackButton from "@/components/nav/BackButton";

const readinessItems = [
  "Real course catalog content and lesson progress",
  "Creator publishing workflow and moderation queue",
  "Paid-course payout, refund, dispute, and tax/legal rules",
  "Report/block flows and community guidelines for learner content",
  "Store-review-safe wording for cannabis education and commerce"
];

export default function CoursesReleaseHold() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <BackButton />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Courses</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Hidden for release</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Courses are not enabled in this release. This area stays hidden until the content,
        moderation, creator, payout, and store-review requirements are finished.
      </Text>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Required before enabling</Text>
        {readinessItems.map((item) => (
          <View key={item} style={styles.row}>
            <View style={styles.dot} />
            <Text style={styles.rowText}>{item}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>
        Release decision: hidden. Do not expose courses in screenshots, navigation, or
        store copy until real content and moderation/legal coverage are complete.
      </Text>

      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => router.replace("/home/personal")}
      >
        <Text style={styles.buttonText}>Back to Home</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 34,
    backgroundColor: "#FFFFFF",
    gap: 14
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap"
  },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  statusBadge: {
    borderWidth: 1,
    borderColor: "#F59E0B",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#FFFBEB"
  },
  statusText: { color: "#92400E", fontSize: 12, fontWeight: "800" },
  subtitle: { color: "#475569", lineHeight: 21 },
  panel: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    padding: 14,
    gap: 10
  },
  panelTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#64748B",
    marginTop: 7
  },
  rowText: { flex: 1, color: "#334155", lineHeight: 20 },
  note: { color: "#64748B", lineHeight: 20, fontSize: 13 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800" }
});
