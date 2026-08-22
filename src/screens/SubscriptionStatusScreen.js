import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/auth/AuthContext";
import { cancelSubscription } from "../api/subscribe";
import { getSubscription } from "../api/subscription";
import ScreenContainer from "../components/ScreenContainer";
import {
  formatSubscriptionDate,
  resolveSubscriptionSafety
} from "../features/billing/subscriptionSafety";
import { radius } from "../theme/theme";
import { openExternalUrl } from "../utils/openExternalUrl";

function subscriptionState(status) {
  return status?.status || status?.subscriptionStatus || "free";
}

function isConfirmedPro(status) {
  const state = subscriptionState(status);
  return (
    Boolean(status?.isPro) ||
    state === "active" ||
    state === "trial" ||
    state === "trialing"
  );
}

const TRIAL_PLAN_LABELS = {
  pro: "Pro",
  commercial: "Commercial",
  facility: "Facility"
};

function remainingTrialPlanLabels(status) {
  const explicit = Array.isArray(status?.trialPlansUsed)
    ? status.trialPlansUsed.filter((plan) =>
        Object.prototype.hasOwnProperty.call(TRIAL_PLAN_LABELS, plan)
      )
    : [];
  const used = new Set(explicit);
  if (!used.size && status?.trialUsed) used.add("pro");
  return Object.entries(TRIAL_PLAN_LABELS)
    .filter(([plan]) => !used.has(plan))
    .map(([, label]) => label);
}

export default function SubscriptionStatusScreen({ navigation }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [statusLoaded, setStatusLoaded] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSubscription();
      setStatus(result?.data ?? result);
      setStatusLoaded(true);
    } catch (error) {
      setStatusLoaded(false);
      Alert.alert("Error", "Failed to load subscription status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );

  const handleCancel = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Cancel renewal at the end of the current billing period? Your paid access stays active until then.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelSubscription(token);
              Alert.alert(
                "Renewal canceled",
                "Your paid access remains active through the current billing period."
              );
              loadStatus();
            } catch (error) {
              Alert.alert("Error", "Failed to cancel subscription");
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.container}>
        <ActivityIndicator size="large" color="#28A745" />
      </ScreenContainer>
    );
  }

  const access = resolveSubscriptionSafety(status, { loaded: statusLoaded });
  const isPro = access.active || isConfirmedPro(status);
  const currentStatus = subscriptionState(status);
  const planLabel = String(status?.plan || access.plan || "pro")
    .toLowerCase()
    .replace(/(^|[_-])\w/g, (match) => match.replace(/[_-]/, " ").toUpperCase());
  const trialing = ["trial", "trialing"].includes(currentStatus);
  const expiry =
    formatSubscriptionDate(access.paidThrough) ||
    (status?.expiry ? new Date(status.expiry).toLocaleDateString() : null);
  const cancellationScheduled = access.cancelScheduled;
  const remainingTrialPlans = remainingTrialPlanLabels(status);

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Subscription Status</Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, isPro && styles.proBadge]}>
              {isPro ? `${planLabel} ${trialing ? "trial" : "paid"} confirmed` : "Free"}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Plan:</Text>
            <Text style={styles.value}>
              {trialing && `${planLabel} Free Trial`}
              {currentStatus === "active" && `${planLabel} Subscription`}
              {currentStatus === "free" && "Free Plan"}
              {currentStatus === "expired" && "Expired"}
              {!["trial", "trialing", "active", "free", "expired"].includes(
                currentStatus
              ) && currentStatus}
            </Text>
          </View>

          {expiry ? (
            <View style={styles.statusRow}>
              <Text style={styles.label}>
                {cancellationScheduled ? "Access through:" : "Renews / ends:"}
              </Text>
              <Text style={styles.value}>{expiry}</Text>
            </View>
          ) : null}

          {remainingTrialPlans.length > 0 && !isPro ? (
            <View style={styles.trialNotice}>
              <Text style={styles.trialText}>
                You have a separate 30-day trial available for{" "}
                {remainingTrialPlans.join(", ")}.
              </Text>
            </View>
          ) : null}

          <Text style={styles.confirmationText}>
            {cancellationScheduled && expiry
              ? "Renewal is canceled. Paid features remain available through the date above."
              : access.message}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadStatus}>
          <Text style={styles.refreshButtonText}>Refresh Status</Text>
        </TouchableOpacity>

        {access.canCancel ? (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        ) : null}

        {access.managementUrl ? (
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => openExternalUrl(access.managementUrl)}
          >
            <Text style={styles.refreshButtonText}>Open Provider Management</Text>
          </TouchableOpacity>
        ) : null}

        {access.canOpenCheckout ? (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate("Paywall")}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to PRO</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5"
  },
  content: {
    flex: 1,
    padding: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
    color: "#333"
  },
  statusCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: radius.card,
    marginBottom: 20,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 3
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15
  },
  label: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500"
  },
  value: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600"
  },
  proBadge: {
    color: "#28A745"
  },
  trialNotice: {
    backgroundColor: "#FFF3CD",
    padding: 12,
    borderRadius: radius.card,
    marginTop: 10
  },
  trialText: {
    fontSize: 14,
    color: "#856404",
    textAlign: "center"
  },
  confirmationText: {
    color: "#666",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12
  },
  refreshButton: {
    backgroundColor: "#E0E0E0",
    paddingVertical: 10,
    borderRadius: radius.card,
    alignItems: "center",
    marginBottom: 10
  },
  refreshButtonText: {
    color: "#333",
    fontSize: 15,
    fontWeight: "bold"
  },
  cancelButton: {
    backgroundColor: "#DC3545",
    paddingVertical: 14,
    borderRadius: radius.card,
    alignItems: "center",
    marginBottom: 10
  },
  cancelButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold"
  },
  upgradeButton: {
    backgroundColor: "#28A745",
    paddingVertical: 14,
    borderRadius: radius.card,
    alignItems: "center"
  },
  upgradeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold"
  }
};
