import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
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
  const [submitting, setSubmitting] = useState(false);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    loadBilling();
    loadSubscription();
  }, [selectedFacilityId]);

  const loadBilling = async () => {
    setLoading(true);
    const res = await getFacilityBillingStatus(selectedFacilityId);
    if (res.success) setBilling(res.data);
    setLoading(false);
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
      // Open checkout URL in browser
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
          if (res.success) loadBilling();
          else Alert.alert("Error", res.message || "Failed to cancel");
        }
      }
    ]);
  };

  const statusText = billing?.status || "none";
  const graceText = billing?.graceUntil
    ? new Date(billing.graceUntil).toLocaleDateString()
    : null;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Billing, Subscription & State Reporting</Text>
      <Text style={styles.info}>
        Manage your facility's billing, subscription, and state compliance reporting.
      </Text>

      <View style={styles.card}>
        <Text style={styles.title}>Facility Plan Billing</Text>
        {loading ? (
          <ActivityIndicator color="#0ea5e9" />
        ) : (
          <>
            <Text style={styles.infoText}>Status: {statusText}</Text>
            {billing?.currentPeriodEnd && (
              <Text style={styles.infoText}>
                Renews: {new Date(billing.currentPeriodEnd).toLocaleDateString()}
              </Text>
            )}
            {graceText && <Text style={styles.infoText}>Grace until: {graceText}</Text>}
            {statusText === "active" || statusText === "trialing" ? (
              <TouchableOpacity
                style={styles.button}
                onPress={handleCancel}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "Processing..." : "Cancel at period end"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.button}
                onPress={handleSubscribe}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "Processing..." : "Subscribe ($50/month)"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Subscription Status</Text>
        {subscription ? (
          <Text style={styles.infoText}>
            Type: {subscription.type || "N/A"} | Status: {subscription.status || "N/A"}
          </Text>
        ) : (
          <Text style={styles.infoText}>Loading subscription info...</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>State Compliance Reporting</Text>
        <Text style={styles.infoText}>
          Download and submit required reports for your state compliance.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Alert.alert("Download", "Report download coming soon.")}
        >
          <Text style={styles.buttonText}>Download State Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, color: "#374151", marginBottom: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
  },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  infoText: { fontSize: 15, color: "#374151", marginBottom: 6 },
  button: {
    backgroundColor: "#0ea5e9",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 }
});
