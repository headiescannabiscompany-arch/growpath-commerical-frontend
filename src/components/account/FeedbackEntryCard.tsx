import React from "react";
import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/theme/appTheme";

export default function FeedbackEntryCard() {
  const { palette } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border }
      ]}
    >
      <Text
        accessibilityRole="header"
        aria-level={2}
        style={[styles.title, { color: palette.text }]}
      >
        Your feedback
      </Text>
      <Text style={{ color: palette.textMuted }}>
        Tell us what works and what needs fixing. Feedback is private unless you
        separately allow us to publish it. This is your personal feedback, not an
        endorsement from your workspace.
      </Text>
      <Link href={"/feedback" as never} style={[styles.link, { color: palette.accent }]}>
        Share or manage feedback
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, borderRadius: 12, gap: 10, marginVertical: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  link: { minHeight: 44, paddingVertical: 12, fontWeight: "700" }
});
