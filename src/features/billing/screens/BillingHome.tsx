import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { cancelSubscription } from "../../../api/subscribe";
import { createCheckoutSession, getSubscription } from "../../../api/subscription";
import { openExternalUrl } from "../../../utils/openExternalUrl";

function subscriptionStatus(plan: any) {
  return String(plan?.subscriptionStatus || plan?.status || "").toLowerCase();
}

function planLabel(plan: any) {
  return String(plan?.plan || "free").toLowerCase();
}

function hasPaidAccess(plan: any) {
  const status = subscriptionStatus(plan);
  const label = planLabel(plan);
  return (
    ["active", "trial", "trialing", "past_due", "unpaid"].includes(status) ||
    label !== "free"
  );
}

export default function BillingHome() {
  const { token } = useAuth();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"upgrade" | "cancel" | null>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getSubscription();
      setPlan(next?.data ?? next ?? null);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  async function startUpgrade() {
    setBusy("upgrade");
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
      setBusy(null);
    }
  }

  async function handleCancel() {
    if (!token) {
      Alert.alert("Sign in required", "Please sign in again before canceling.");
      return;
    }
    setBusy("cancel");
    try {
      await cancelSubscription(token);
      Alert.alert("Cancellation submitted", "Status updates after backend confirmation.");
      await loadPlan();
    } catch (error: any) {
      Alert.alert("Cancel failed", error?.message || "Unable to cancel subscription.");
    } finally {
      setBusy(null);
    }
  }

  const paid = hasPaidAccess(plan);
  const currentPlan = planLabel(plan);
  const currentStatus = subscriptionStatus(plan) || "unknown";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Billing</Text>
      <Text style={styles.meta}>Plan: {currentPlan}</Text>
      <Text style={styles.meta}>Status: {currentStatus}</Text>
      <Text style={styles.note}>
        {paid
          ? "Your paid subscription is confirmed here. Cancel from this screen when you are ready. "
          : "You are not on a paid plan yet. Use this screen to open the upgrade checkout."}
      </Text>
      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={() => void loadPlan()}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Refreshing..." : "Refresh Status"}
        </Text>
      </Pressable>
      {paid ? (
        <Pressable
          style={[styles.cancelButton, busy === "cancel" && styles.buttonDisabled]}
          onPress={() => void handleCancel()}
          disabled={busy === "cancel"}
        >
          <Text style={styles.cancelButtonText}>
            {busy === "cancel" ? "Canceling..." : "Cancel Subscription"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.button, busy === "upgrade" && styles.buttonDisabled]}
          onPress={() => void startUpgrade()}
          disabled={busy === "upgrade"}
        >
          <Text style={styles.buttonText}>
            {busy === "upgrade" ? "Opening..." : "Upgrade to Pro"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: "bold" },
  meta: { color: "#475569" },
  note: { color: "#334155", lineHeight: 20 },
  button: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderColor: "#FCA5A5",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  cancelButtonText: { color: "#DC2626", fontWeight: "800", textAlign: "center" },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" }
});
