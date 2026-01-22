import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

export default function PaymentsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Payments & Upgrades</Text>
      <Text style={styles.subtitle}>
        Manage your organization's payments, subscriptions, and upgrades.
      </Text>
      {/* Payment history */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        {/* Payment history will be rendered here */}
        <Text style={styles.placeholder}>No payments found.</Text>
      </View>
      {/* Subscription status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Subscription</Text>
        {/* Current subscription status will be rendered here */}
        <Text style={styles.placeholder}>Free Plan</Text>
        <TouchableOpacity style={styles.upgradeBtn}>
          <Text style={styles.upgradeBtnText}>Upgrade Plan</Text>
        </TouchableOpacity>
      </View>
      {/* Upgrade options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upgrade Options</Text>
        {/* Upgrade options will be rendered here */}
        <Text style={styles.placeholder}>Pro, Influencer, Commercial, Enterprise</Text>
      </View>
    </ScrollView>
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
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 1px 2px rgba(0,0,0,0.03)",
    elevation: 1
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1D4ED8",
    marginBottom: 6
  },
  placeholder: {
    fontSize: 14,
    color: "#888",
    marginBottom: 8
  },
  upgradeBtn: {
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8
  },
  upgradeBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16
  }
});
