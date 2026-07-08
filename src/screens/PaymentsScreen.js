/* eslint-disable react/no-unescaped-entities */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { createCheckoutSession, getSubscriptionStatus } from "../api/subscription";
import { openExternalUrl } from "../utils/openExternalUrl";
import { radius } from "../theme/theme";

function normalizeSubscription(status) {
  const source = status?.data && typeof status.data === "object" ? status.data : status;
  return {
    plan: source?.plan || source?.tier || "free",
    status: source?.status || source?.subscriptionStatus || "free",
    renewsAt: source?.renewsAt || source?.currentPeriodEnd || source?.periodEnd || null,
    customerEmail: source?.customerEmail || source?.email || null
  };
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString();
}

export default function PaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState(null);

  const current = useMemo(
    () => normalizeSubscription(subscription || {}),
    [subscription]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await getSubscriptionStatus();
      setSubscription(next || {});
    } catch (err) {
      setError(err?.message || "Unable to load subscription status.");
      setSubscription({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCheckout = useCallback(async () => {
    setStartingCheckout(true);
    try {
      const checkout = await createCheckoutSession();
      const url = checkout?.url || checkout?.checkoutUrl || checkout?.sessionUrl;
      if (!url) {
        Alert.alert("Checkout unavailable", "The backend did not return a checkout URL.");
        return;
      }
      await openExternalUrl(url);
    } catch (err) {
      Alert.alert("Checkout failed", err?.message || "Unable to start checkout.");
    } finally {
      setStartingCheckout(false);
    }
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Payments & Upgrades</Text>
      <Text style={styles.subtitle}>
        Manage your organization's subscription and billing access.
      </Text>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading subscription...</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Subscription</Text>
        <InfoRow label="Plan" value={current.plan} />
        <InfoRow label="Status" value={current.status} />
        <InfoRow label="Renews" value={formatDate(current.renewsAt)} />
        <InfoRow label="Billing email" value={current.customerEmail || "Account email"} />
        <TouchableOpacity
          accessibilityRole="button"
          disabled={startingCheckout}
          onPress={startCheckout}
          style={[styles.upgradeBtn, startingCheckout && styles.disabledBtn]}
        >
          <Text style={styles.upgradeBtnText}>
            {startingCheckout ? "Opening Checkout..." : "Upgrade Plan"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plan Access</Text>
        {["Free", "Pro", "Commercial", "Enterprise"].map((plan) => (
          <View key={plan} style={styles.planRow}>
            <Text style={styles.planName}>{plan}</Text>
            <Text style={styles.planMeta}>
              {plan.toLowerCase() === String(current.plan).toLowerCase()
                ? "Current"
                : "Available"}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: "#F9FAFB"
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: "#444",
    marginBottom: 16
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.03)",
    elevation: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 10
  },
  infoRow: {
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 9
  },
  infoLabel: {
    color: "#374151",
    fontWeight: "700"
  },
  infoValue: {
    color: "#111827",
    flexShrink: 1,
    fontWeight: "800",
    textAlign: "right",
    textTransform: "capitalize"
  },
  planRow: {
    alignItems: "center",
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10
  },
  planName: {
    color: "#111827",
    fontWeight: "800"
  },
  planMeta: {
    color: "#64748B",
    fontWeight: "700"
  },
  muted: {
    color: "#64748B"
  },
  error: {
    color: "crimson",
    fontWeight: "700",
    marginBottom: 12
  },
  upgradeBtn: {
    alignItems: "center",
    backgroundColor: "#10B981",
    borderRadius: radius.card,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  disabledBtn: {
    opacity: 0.6
  },
  upgradeBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  }
});
