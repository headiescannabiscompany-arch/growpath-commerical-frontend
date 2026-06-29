import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { createCheckoutSession, getSubscription } from "../../../api/subscription";
import { openExternalUrl } from "../../../utils/openExternalUrl";

export default function BillingHome() {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSubscription()
      .then(setPlan)
      .catch(() => setPlan(null));
  }, []);

  async function startUpgrade() {
    setLoading(true);
    try {
      const checkout = await createCheckoutSession({ plan: "pro", interval: "monthly" });
      const url = checkout?.url || checkout?.checkoutUrl || checkout?.data?.url;
      if (!url) {
        Alert.alert("Checkout unavailable", "The backend did not return a checkout URL.");
        return;
      }
      await openExternalUrl(url);
    } catch (error: any) {
      Alert.alert("Checkout failed", error?.message || "Unable to start checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Current Plan: {plan?.plan || "Loading..."}</Text>
      <Text style={styles.meta}>Status: {plan?.subscriptionStatus || "unknown"}</Text>
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={startUpgrade}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "Opening..." : "Upgrade"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#475569" },
  button: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" }
});
