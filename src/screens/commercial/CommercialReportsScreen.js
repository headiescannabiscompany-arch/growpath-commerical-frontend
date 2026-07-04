import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import ScreenContainer from "../../components/ScreenContainer";

function ReportCard({ title, body, bullets = [], actionLabel, route, navigation }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {bullets.map((bullet) => (
        <Text key={bullet} style={styles.bullet}>
          {bullet}
        </Text>
      ))}
      {route ? (
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={() => navigation?.navigate?.(route)}
        >
          <Text style={styles.buttonText}>{actionLabel || "Open"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function CommercialReportsScreen({ navigation }) {
  return (
    <ScreenContainer scroll={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.kicker}>Commercial workspace</Text>
        <Text style={styles.title}>Reports & Analytics</Text>
        <Text style={styles.subtitle}>
          Review product trial evidence, storefront/content activity, course outcomes,
          inventory signals, and external purchase tracking without pretending external
          clicks are internal orders.
        </Text>

        <ReportCard
          title="Product trial outcomes"
          body="Use grow records, product batches, pH/EC checks, diagnosis logs, harvest data, dry/cure checks, and final product notes as evidence before publishing claims."
          bullets={[
            "Active and completed product trials",
            "Formula or batch linked to a grow",
            "Effectiveness summary and limitations",
            "Feed, course, or storefront proof created from saved records"
          ]}
          actionLabel="Open Product Trials"
          route="CommercialProductTrials"
          navigation={navigation}
        />

        <ReportCard
          title="Storefront and product activity"
          body="Start with useful counts: ad clicks, marketing link clicks, product views, storefront views, featured product clicks, external purchase clicks, and product-support inquiries."
          bullets={[
            "Ad clicks and marketing-plan clicks",
            "Product views and outbound clicks",
            "Storefront-to-product movement",
            "Similar brand discovery",
            "Return-to-feed behavior"
          ]}
          actionLabel="Open Storefront"
          route="Storefront"
          navigation={navigation}
        />

        <ReportCard
          title="Feed, course, and community outcomes"
          body="Commercial content should connect back to real products, trials, courses, and support threads."
          bullets={[
            "Feed post views, saves, comments, and clicks",
            "Promotional post and ad-link click counts",
            "Course starts and completions",
            "Forum replies and unresolved support threads",
            "Trial summaries converted into education or support"
          ]}
          actionLabel="Open Feed"
          route="Feed"
          navigation={navigation}
        />

        <ReportCard
          title="Orders / external tracking"
          body="Internal order fulfillment belongs here only when checkout exists. External product links should be judged by views, clicks, inquiries, and follow-up content."
          bullets={[
            "Internal orders if checkout is enabled",
            "External purchase link clicks",
            "Product-support inquiries",
            "Lead or customer follow-up notes"
          ]}
          actionLabel="Open External Tracking"
          route="CommercialOrders"
          navigation={navigation}
        />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingBottom: 80 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  title: { color: "#0F172A", fontSize: 26, fontWeight: "900" },
  subtitle: { color: "#475569", lineHeight: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 10,
    borderWidth: 1,
    padding: 14
  },
  cardTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  body: { color: "#475569", lineHeight: 20, marginTop: 6 },
  bullet: { color: "#334155", fontWeight: "700", marginTop: 6 },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  buttonText: { color: "#FFFFFF", fontWeight: "900" }
});
