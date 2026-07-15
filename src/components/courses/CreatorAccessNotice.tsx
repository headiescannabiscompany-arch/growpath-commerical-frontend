import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { radius } from "@/theme/theme";

const CREATOR_APPLICATION_EMAIL = "support@growpathai.com";

function applicationUrl(accountEmail?: string) {
  const subject = "30-day GrowPathAI Creator plan application";
  const body = [
    "Name:",
    `GrowPathAI account email: ${String(accountEmail || "")}`,
    "Channel information:",
    "Social links:",
    "Requested account type:",
    "What I plan to test:"
  ].join("\n");
  return `mailto:${CREATOR_APPLICATION_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function CreatorAccessNotice({ accountEmail }: { accountEmail?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Create courses on any plan</Text>
      <Text style={styles.body}>
        All GrowPathAI users can create and publish free or paid courses, including users
        on the Free plan. Plan limits may control course counts, lessons, storage, and
        advanced creator features.
      </Text>
      <Text style={styles.body}>
        Content creators may apply for 30 days of free access to the paid Creator plan to
        test advanced storefront, course, live-streaming, analytics, and
        audience-management features.
      </Text>
      <Text style={styles.body}>
        When the 30 days end, courses remain intact and available. The account returns to
        Free-plan limits unless the creator subscribes.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Apply for 30-day Creator access"
        onPress={() => void Linking.openURL(applicationUrl(accountEmail))}
        style={styles.action}
      >
        <Text style={styles.actionText}>Apply for 30-day Creator access</Text>
      </Pressable>
      <Text style={styles.help}>
        Email {CREATOR_APPLICATION_EMAIL} with your name, account email, channel
        information, social links, requested account type, and what you plan to test.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  title: { color: "#14532d", fontSize: 17, fontWeight: "900" },
  body: { color: "#36543c", fontSize: 14, lineHeight: 20 },
  action: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  actionText: { color: "white", fontWeight: "900" },
  help: { color: "#4b6450", fontSize: 12, lineHeight: 17 }
});
