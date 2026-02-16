import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

import { sanitizeViewChildren } from "./layout/sanitizeViewChildren";
export default function ScreenScaffold({
  title,
  subtitle,
  mode,
  status = "STUB",
  children,
  debug
}) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{mode ? mode.toUpperCase() : "MODE"}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              status === "LIVE" ? styles.badgeLive : styles.badgeStub
            ]}
          >
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        </View>
      </View>

      {children ? (
        <View style={styles.body}>
          {sanitizeViewChildren(children, "ScreenScaffold.body")}
        </View>
      ) : null}

      {debug ? (
        <View style={styles.debug}>
          <Text style={styles.debugTitle}>Debug</Text>
          <Text style={styles.debugText}>
            {typeof debug === "string" ? debug : JSON.stringify(debug, null, 2)}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

export function Section({ title, children, right }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right ? (
          <View style={styles.sectionRight}>
            {sanitizeViewChildren(right, "ScreenScaffold.right")}
          </View>
        ) : null}
      </View>
      <View style={styles.sectionBody}>
        {sanitizeViewChildren(children, "ScreenScaffold.sectionBody")}
      </View>
    </View>
  );
}

export function Card({ title, children, tone = "default" }) {
  return (
    <View
      style={[
        styles.card,
        tone === "warning" ? styles.cardWarn : null,
        tone === "success" ? styles.cardSuccess : null
      ]}
    >
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {sanitizeViewChildren(children, "ScreenScaffold.children")}
    </View>
  );
}

export function Pill({ text, tone = "default" }) {
  return (
    <View
      style={[
        styles.pill,
        tone === "locked" ? styles.pillLocked : null,
        tone === "ok" ? styles.pillOk : null
      ]}
    >
      <Text style={styles.pillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0b0f17" },
  container: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 14 },
  kicker: { color: "#7aa2ff", fontSize: 12, letterSpacing: 1, marginBottom: 6 },
  title: { color: "#ffffff", fontSize: 26, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#a9b4c6", fontSize: 14, lineHeight: 20 },
  badges: { flexDirection: "row", gap: 8, marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeStub: { backgroundColor: "#2a2f3a" },
  badgeLive: { backgroundColor: "#1d4ed8" },
  badgeText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  body: { gap: 12 },

  section: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f2937"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  sectionTitle: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  sectionRight: {},
  sectionBody: { gap: 10 },

  card: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f2937"
  },
  cardWarn: { borderColor: "#b45309" },
  cardSuccess: { borderColor: "#15803d" },
  cardTitle: { color: "#ffffff", fontSize: 14, fontWeight: "700", marginBottom: 6 },

  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#243042"
  },
  pillLocked: { backgroundColor: "#3b1d1d" },
  pillOk: { backgroundColor: "#0f3d2a" },
  pillText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },

  debug: {
    marginTop: 14,
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f2937"
  },
  debugTitle: { color: "#ffffff", fontWeight: "700", marginBottom: 6 },
  debugText: { color: "#a9b4c6", fontSize: 12, lineHeight: 16 }
});
