import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getSubscription } from "../../../api/subscription";

export default function ManageSubscription() {
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    getSubscription()
      .then(setPlan)
      .catch(() => setPlan(null));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Subscription</Text>
      <Text style={styles.meta}>Plan: {plan?.plan || "unknown"}</Text>
      <Text style={styles.meta}>Status: {plan?.subscriptionStatus || "unknown"}</Text>
      <Text style={styles.note}>
        Billing changes are confirmed by Stripe webhooks. Portal management will be
        enabled after the backend exposes a billing portal session endpoint.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, padding: 24 },
  title: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#334155", fontWeight: "700" },
  note: { color: "#64748B", lineHeight: 20 }
});
