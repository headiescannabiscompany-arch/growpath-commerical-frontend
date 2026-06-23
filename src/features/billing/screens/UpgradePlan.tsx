import React, { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { createCheckoutSession } from "../../../api/subscription";

const plans = [
  { label: "Pro", plan: "pro", interval: "monthly" },
  { label: "Commercial", plan: "commercial", interval: "monthly" },
  { label: "Facility", plan: "facility", interval: "monthly" }
];

export default function UpgradePlan() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (plan: string, interval: string) => {
    setLoadingPlan(plan);
    try {
      const checkout = await createCheckoutSession({ plan, interval });
      const url = checkout?.url || checkout?.checkoutUrl || checkout?.data?.url;
      if (!url) {
        Alert.alert("Checkout unavailable", "The backend did not return a checkout URL.");
        return;
      }
      await Linking.openURL(url);
    } catch (error: any) {
      Alert.alert("Checkout failed", error?.message || "Unable to start checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade Plan</Text>
      {plans.map((item) => (
        <Pressable
          key={item.plan}
          style={[styles.button, loadingPlan === item.plan && styles.buttonDisabled]}
          disabled={!!loadingPlan}
          onPress={() => handleUpgrade(item.plan, item.interval)}
        >
          <Text style={styles.buttonText}>
            {loadingPlan === item.plan ? "Opening..." : `Upgrade to ${item.label}`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: "bold" },
  button: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" }
});
