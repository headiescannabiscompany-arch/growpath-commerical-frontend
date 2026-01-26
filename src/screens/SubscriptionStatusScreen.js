import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/auth/AuthContext";
import { getSubscriptionStatus, cancelSubscription } from "../api/subscribe";
import ScreenContainer from "../components/ScreenContainer";

export default function SubscriptionStatusScreen({ navigation }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

  // Refresh on mount
  useEffect(() => {
    loadStatus();
  }, []);

  // Refresh on screen focus (after returning from Stripe)
  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [])
  );

  const loadStatus = async () => {
    setLoading(true);
    try {
      const result = await getSubscriptionStatus(token);
      if (result.success) {
        setStatus(result);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load subscription status");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel your PRO subscription?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await cancelSubscription(token);
              if (result.success) {
                Alert.alert("Cancelled", "Your subscription has been cancelled.");
                loadStatus();
              }
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

  const isPro = status?.isPro;
  const subscriptionStatus = status?.status || "free";
  const expiry = status?.expiry ? new Date(status.expiry).toLocaleDateString() : null;
  const trialUsed = status?.trialUsed;

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Subscription Status</Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, isPro && styles.proBadge]}>
              {isPro ? "✅ PRO" : "🔓 Free"}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.label}>Plan:</Text>
            <Text style={styles.value}>
              {subscriptionStatus === "trial" && "Free Trial"}
              {subscriptionStatus === "active" && "PRO Subscription"}
              {subscriptionStatus === "free" && "Free Plan"}
              {subscriptionStatus === "expired" && "Expired"}
            </Text>
          </View>

          {expiry && (
            <View style={styles.statusRow}>
              <Text style={styles.label}>Expires:</Text>
              <Text style={styles.value}>{expiry}</Text>
            </View>
          )}

          {!trialUsed && !isPro && (
            <View style={styles.trialNotice}>
              <Text style={styles.trialText}>
                🎁 You have a 7-day free trial available!
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadStatus}>
          <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
        </TouchableOpacity>

        {isPro && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        )}

        {!isPro && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate("Paywall")}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to PRO</Text>
          </TouchableOpacity>
        )}
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
    borderRadius: 12,
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
    borderRadius: 8,
    marginTop: 10
  },
  trialText: {
    fontSize: 14,
    color: "#856404",
    textAlign: "center"
  },
  refreshButton: {
    backgroundColor: "#E0E0E0",
    paddingVertical: 10,
    borderRadius: 8,
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
    borderRadius: 10,
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
    borderRadius: 10,
    alignItems: "center"
  },
  upgradeButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold"
  }
};
