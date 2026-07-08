import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { createCheckoutSession } from "../../../api/subscription";
import {
  formatPlanBillingNote,
  formatPlanPrice,
  PLAN_PRICING
} from "../../../constants/pricing";
import { openExternalUrl } from "../../../utils/openExternalUrl";

const plans = [
  { label: PLAN_PRICING.pro.title, plan: "pro" },
  { label: PLAN_PRICING.commercial.title, plan: "commercial" },
  { label: PLAN_PRICING.facility.title, plan: "facility" }
];

const intervals = ["monthly", "yearly"] as const;

export default function UpgradePlan() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleUpgrade = async (plan: string, interval: string) => {
    setLoadingPlan(`${plan}:${interval}`);
    try {
      const checkout = await createCheckoutSession({ plan, interval });
      const url = checkout?.url || checkout?.checkoutUrl || checkout?.data?.url;
      if (!url) {
        Alert.alert("Checkout unavailable", "The backend did not return a checkout URL.");
        return;
      }
      await openExternalUrl(url);
    } catch (error: any) {
      Alert.alert("Checkout failed", error?.message || "Unable to start checkout.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upgrade Plan</Text>
      <Text style={styles.subtitle}>
        Choose monthly or annual billing. Annual plans are billed once yearly and show
        the monthly equivalent separately.
      </Text>
      {plans.map((item) => (
        <View key={item.plan} style={styles.planCard}>
          <Text style={styles.planTitle}>{item.label}</Text>
          <Text style={styles.planPrice}>
            {formatPlanPrice(item.plan, "monthly")}/month or{" "}
            {formatPlanPrice(item.plan, "yearly")}/year
          </Text>
          <Text style={styles.planNote}>
            Annual: {formatPlanBillingNote(item.plan, "yearly")}
          </Text>
          <View style={styles.buttonRow}>
            {intervals.map((interval) => {
              const loadingKey = `${item.plan}:${interval}`;
              const loading = loadingPlan === loadingKey;
              return (
                <Pressable
                  key={loadingKey}
                  style={[styles.button, loading && styles.buttonDisabled]}
                  disabled={!!loadingPlan}
                  onPress={() => handleUpgrade(item.plan, interval)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${item.label} ${interval}`}
                >
                  <Text style={styles.buttonText}>
                    {loading
                      ? "Opening..."
                      : `${interval === "monthly" ? "Monthly" : "Yearly"} - ${formatPlanPrice(
                          item.plan,
                          interval
                        )}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: "bold" },
  subtitle: { color: "#475569", fontSize: 14, fontWeight: "700" },
  planCard: {
    backgroundColor: "#f8fafc",
    borderColor: "#d9e2e8",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  planTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900" },
  planPrice: { color: "#166534", fontSize: 15, fontWeight: "900" },
  planNote: { color: "#64748b", fontSize: 13, fontWeight: "700" },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    backgroundColor: "#166534",
    borderRadius: 8,
    minWidth: 132,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" }
});
