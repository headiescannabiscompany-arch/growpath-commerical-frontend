import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";

import { radius } from "../theme/theme";
import { sanitizeViewChildren } from "./layout/sanitizeViewChildren";
import { useAppTheme } from "@/theme/appTheme";
export default function ScreenScaffold({
  title,
  subtitle,
  mode,
  status = "LIVE",
  children,
  debug
}) {
  const { palette } = useAppTheme();

  return (
    <ScrollView
      style={[styles.page, { backgroundColor: palette.page }]}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: palette.accent }]}>
          {mode ? mode.toUpperCase() : "MODE"}
        </Text>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: palette.textMuted }]}>{subtitle}</Text>
        ) : null}

        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              status === "LIVE"
                ? [styles.badgeLive, { backgroundColor: palette.accent }]
                : [styles.badgeStub, { backgroundColor: palette.surfaceMuted }]
            ]}
          >
            <Text style={[styles.badgeText, { color: palette.accentText }]}>
              {status}
            </Text>
          </View>
        </View>
      </View>

      {children ? (
        <View style={styles.body}>
          {sanitizeViewChildren(children, "ScreenScaffold.body")}
        </View>
      ) : null}

      {debug ? (
        <View
          style={[
            styles.debug,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.debugTitle, { color: palette.text }]}>Debug</Text>
          <Text style={[styles.debugText, { color: palette.textMuted }]}>
            {typeof debug === "string" ? debug : JSON.stringify(debug, null, 2)}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

export function Section({ title, children, right }) {
  const { palette } = useAppTheme();
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
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
  const { palette } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border },
        tone === "warning" ? { borderColor: palette.warning } : null,
        tone === "success" ? { borderColor: palette.success } : null
      ]}
    >
      {title ? (
        <Text style={[styles.cardTitle, { color: palette.text }]}>{title}</Text>
      ) : null}
      {sanitizeViewChildren(children, "ScreenScaffold.children")}
    </View>
  );
}

export function Pill({ text, tone = "default" }) {
  const { palette } = useAppTheme();
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: palette.surfaceMuted },
        tone === "locked" ? { backgroundColor: palette.danger } : null,
        tone === "ok" ? { backgroundColor: palette.success } : null
      ]}
    >
      <Text style={[styles.pillText, { color: palette.accentText }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F1F7F2" },
  container: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 14 },
  kicker: { color: "#166534", fontSize: 12, letterSpacing: 1, marginBottom: 6 },
  title: { color: "#122012", fontSize: 26, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#5F6F5F", fontSize: 14, lineHeight: 20 },
  badges: { flexDirection: "row", gap: 8, marginTop: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill },
  badgeStub: { backgroundColor: "#E3F4E9" },
  badgeLive: { backgroundColor: "#166534" },
  badgeText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  body: { gap: 12 },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D7E3D5"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  sectionTitle: { color: "#122012", fontSize: 16, fontWeight: "700" },
  sectionRight: {},
  sectionBody: { gap: 10 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D7E3D5"
  },
  cardWarn: { borderColor: "#b45309" },
  cardSuccess: { borderColor: "#15803d" },
  cardTitle: { color: "#122012", fontSize: 14, fontWeight: "700", marginBottom: 6 },

  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: "#E3F4E9"
  },
  pillLocked: { backgroundColor: "#FEE2E2" },
  pillOk: { backgroundColor: "#DCFCE7" },
  pillText: { color: "#122012", fontSize: 12, fontWeight: "700" },

  debug: {
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D7E3D5"
  },
  debugTitle: { color: "#122012", fontWeight: "700", marginBottom: 6 },
  debugText: { color: "#5F6F5F", fontSize: 12, lineHeight: 16 }
});
