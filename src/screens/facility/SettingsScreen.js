import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getFacilityBillingStatus, startFacilityCheckout, cancelFacilityPlan } from "../../api/facility";
import * as Linking from "expo-linking";

const SettingsScreen = ({ navigation }) => {
  const { user, selectedFacilityId, setMode, setSelectedFacilityId, logout } = useAuth();
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadBilling = async () => {
    if (!selectedFacilityId) return;
    setLoading(true);
    const res = await getFacilityBillingStatus(selectedFacilityId);
    if (res.success) setBilling(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadBilling();
  }, [selectedFacilityId]);

  useEffect(() => {
    const handleUrl = (event) => {
      const url = event.url || '';
      if (url.includes('facilityPlan=success')) {
        loadBilling();
      }
    };
    const subscription = Linking.addEventListener('url', handleUrl);
    return () => subscription.remove();
  }, []);

  const handleSwitchToPersonal = async () => {
    await setMode("personal");
    await setSelectedFacilityId(null);
    navigation.reset({
      index: 0,
      routes: [{ name: "MainTabs" }]
    });
  };

  const handleSubscribe = async () => {
    if (!selectedFacilityId) {
      Alert.alert("Select a facility first");
      return;
    }
    setLoading(true);
    const res = await startFacilityCheckout(selectedFacilityId);
    setLoading(false);
    if (!res.success) {
      Alert.alert("Checkout failed", res.message || "Try again");
      return;
    }
    const url = res.data?.url;
    if (url) {
      Linking.openURL(url);
      // Also listen for redirect query param when app resumes
      loadBilling();
    }
  };

  const handleCancel = async () => {
    if (!selectedFacilityId) return;
    Alert.alert("Cancel Facility Plan", "Cancel at period end?", [
      { text: "No" },
      {
        text: "Yes",
        onPress: async () => {
          setLoading(true);
          const res = await cancelFacilityPlan(selectedFacilityId);
          setLoading(false);
          if (!res.success) {
            Alert.alert("Cancel failed", res.message || "Try again");
            return;
          }
          loadBilling();
        }
      }
    ]);
  };

  const statusText = billing?.status || "none";
  const graceText = billing?.graceUntil ? new Date(billing.graceUntil).toLocaleDateString() : null;

  const renderBillingSection = () => (
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
            <TouchableOpacity style={styles.button} onPress={handleCancel}>
              <Text style={styles.buttonText}>Cancel at period end</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.button} onPress={handleSubscribe}>
              <Text style={styles.buttonText}>Subscribe ($50/month)</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>GrowPath AI Facility Plan</Text>
        <Text style={styles.subtitle}>$50/month • Metrc-ready facility ops</Text>
        <View style={styles.section}>
          <Text style={styles.label}>Current User</Text>
          <Text style={styles.value}>{user?.name || "Unknown"}</Text>
        </View>
      </View>

      {renderBillingSection()}

      <TouchableOpacity style={styles.button} onPress={handleSwitchToPersonal}>
        <Text style={styles.buttonText}>🏠 Switch to GrowPath AI (Personal)</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={() => {
          Alert.alert("Logout", "Are you sure?", [
            { text: "Cancel", onPress: () => {} },
            {
              text: "Logout",
              onPress: () => logout()
            }
          ]);
        }}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>Facility Plan Inclusions</Text>
        <Text style={styles.infoText}>
          $50/month covers facility and room management, role-based access, Metrc sync, SOPs, audit logs, and reconciliations.
        </Text>
        <Text style={[styles.infoText, { marginTop: 12 }]}>
          Roadmap highlights:
        </Text>
        <Text style={styles.feature}>• Task verification & shift handoff</Text>
        <Text style={styles.feature}>• Deviation handling & reports</Text>
        <Text style={styles.feature}>• Billing and branded exports</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
    fontWeight: "500"
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingTop: 12
  },
  label: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 4
  },
  value: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600"
  },
  button: {
    backgroundColor: "#0ea5e9",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: "center"
  },
  logoutButton: {
    backgroundColor: "#ef4444"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20
  },
  feature: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    marginLeft: 8
  }
});

export default SettingsScreen;
