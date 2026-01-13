import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  getFacilityBillingStatus,
  startFacilityCheckout,
  cancelFacilityPlan
} from "../../api/facility";
import { getSubscriptionStatus } from "../../api/subscribe";

export default function BillingAndReportingScreen() {
  const { selectedFacilityId } = useAuth();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadBilling();
  }, [selectedFacilityId]);

  const loadBilling = async () => {
    setLoading(true);
    const res = await getFacilityBillingStatus(selectedFacilityId);
    if (res.success) setBilling(res.data);
    setLoading(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([loadBilling(), loadSubscription()]).then(() => setRefreshing(false));
  };

  const loadSubscription = async () => {
    const res = await getSubscriptionStatus();
    if (res.success) setSubscription(res.data);
  };

  const handleSubscribe = async () => {
    setSubmitting(true);
    const res = await startFacilityCheckout(selectedFacilityId);
    setSubmitting(false);
    if (res.success && res.data?.checkoutUrl) {
      window.open(res.data.checkoutUrl, "_blank");
    } else {
      Alert.alert("Error", res.message || "Failed to start subscription");
    }
  };

  const handleCancel = async () => {
    Alert.alert("Cancel Subscription", "Are you sure you want to cancel at period end?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          setSubmitting(true);
          const res = await cancelFacilityPlan(selectedFacilityId);
          setSubmitting(false);
          if (res.success) {
            loadBilling();
            Alert.alert("Success", "Subscription cancelled at period end");
          } else {
            Alert.alert("Error", res.message || "Failed to cancel");
          }
        }
      }
    ]);
  };

  const getStatusBadgeColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active": return { bg: "#d1fae5", text: "#065f46" };
      case "trialing": return { bg: "#dbeafe", text: "#0c4a6e" };
      case "canceled": return { bg: "#fee2e2", text: "#991b1b" };
      default: return { bg: "#f3f4f6", text: "#374151" };
    }
  };

  const statusText = billing?.status || "none";
  const statusBadge = getStatusBadgeColor(statusText);
  const graceDate = billing?.graceUntil
    ? new Date(billing.graceUntil).toLocaleDateString()
    : null;
  const renewDate = billing?.currentPeriodEnd
    ? new Date(billing.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Billing & Reporting</Text>
        <Text style={styles.subtitle}>Manage subscriptions and generate reports</Text>
      </View>

      {/* Billing Status Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Plan Status</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusBadge.bg }
            ]}
          >
            <Text style={[styles.statusText, { color: statusBadge.text }]}>
              {statusText.charAt(0).toUpperCase() + statusText.slice(1)}
            </Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#0ea5e9" />
        ) : (
          <>
            <View style={styles.billingInfo}>
              {renewDate && (
                <View style={styles.infoBit}>
                  <Text style={styles.infoLabel}>Renews on</Text>
                  <Text style={styles.infoValue}>{renewDate}</Text>
                </View>
              )}
              {graceDate && (
                <View style={styles.infoBit}>
                  <Text style={styles.infoLabel}>Grace period until</Text>
                  <Text style={styles.infoValue}>{graceDate}</Text>
                </View>
              )}
              <View style={styles.infoBit}>
                <Text style={styles.infoLabel}>Price</Text>
                <Text style={styles.infoValue}>$50/month</Text>
              </View>
            </View>

            {statusText === "active" || statusText === "trialing" ? (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, submitting && styles.disabled]}
                onPress={handleCancel}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>
                  {submitting ? "Processing..." : "Cancel at Period End"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.subscribeButton, submitting && styles.disabled]}
                onPress={handleSubscribe}
                disabled={submitting}
              >
                <Text style={styles.subscribeButtonText}>
                  {submitting ? "Processing..." : "Subscribe Now"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Subscription Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Subscription Details</Text>
        {subscription ? (
          <View style={styles.subscriptionInfo}>
            <View style={styles.infoBit}>
              <Text style={styles.infoLabel}>Type</Text>
              <Text style={styles.infoValue}>{subscription.type || "Standard"}</Text>
            </View>
            <View style={styles.infoBit}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{subscription.status || "Active"}</Text>
            </View>
            {subscription.features && (
              <View style={styles.infoBit}>
                <Text style={styles.infoLabel}>Included Features</Text>
                <Text style={styles.infoValue}>
                  {Array.isArray(subscription.features)
                    ? subscription.features.join(", ")
                    : "All features"}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.loadingText}>Loading subscription info...</Text>
        )}
      </View>

      {/* Reporting Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Compliance Reports</Text>
        <Text style={styles.cardSubtext}>
          Generate and download required reports for your state
        </Text>
        <TouchableOpacity
          style={[styles.button, styles.reportButton]}
          onPress={() => Alert.alert("Coming Soon", "State report generation coming soon.")}
        >
          <Text style={styles.reportButtonText}>Download State Report</Text>
        </TouchableOpacity>
      </View>

      {/* Usage Card */}
      <View style={[styles.card, { marginBottom: 32 }]}>
        <Text style={styles.cardTitle}>Usage Summary</Text>
        <View style={styles.usageGrid}>
          <View style={styles.usageItem}>
            <Text style={styles.usageValue}>0</Text>
            <Text style={styles.usageLabel}>Plants</Text>
          </View>
          <View style={styles.usageItem}>
            <Text style={styles.usageValue}>0</Text>
            <Text style={styles.usageLabel}>Rooms</Text>
          </View>
          <View style={styles.usageItem}>
            <Text style={styles.usageValue}>0</Text>
            <Text style={styles.usageLabel}>Tasks</Text>
          </View>
          <View style={styles.usageItem}>
            <Text style={styles.usageValue}>0</Text>
            <Text style={styles.usageLabel}>Users</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16
  },
  header: {
    paddingVertical: 24
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937"
  },
  cardSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    minWidth: 80,
    alignItems: "center"
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600"
  },
  billingInfo: {
    marginBottom: 20
  },
  subscriptionInfo: {
    gap: 12
  },
  infoBit: {
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingBottom: 12,
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 4
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937"
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center"
  },
  subscribeButton: {
    backgroundColor: "#0ea5e9"
  },
  subscribeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  cancelButton: {
    backgroundColor: "#fee2e2"
  },
  cancelButtonText: {
    color: "#991b1b",
    fontWeight: "700",
    fontSize: 16
  },
  reportButton: {
    backgroundColor: "#8b5cf6",
    marginTop: 12
  },
  reportButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },
  disabled: {
    opacity: 0.6
  },
  usageGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    gap: 8
  },
  usageItem: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  usageValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0ea5e9"
  },
  usageLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500"
  },
  loadingText: {
    color: "#9ca3af",
    fontSize: 14,
    fontStyle: "italic"
  }
});
