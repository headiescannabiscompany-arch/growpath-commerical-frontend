import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import ScreenContainer from "../../components/ScreenContainer";
import { useAuth } from "@/auth/AuthContext";

export default function CommercialProfileScreen({ navigation }) {
  const { user } = useAuth();
  const businessName =
    user?.business?.name || user?.businessName || user?.companyName || "Commercial account";
  const email = user?.business?.contactEmail || user?.email || "No email";
  const phone = user?.business?.phone || "No phone";

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Text style={styles.title}>Commercial Profile</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Business</Text>
          <Text style={styles.value}>{businessName}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email}</Text>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{phone}</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("PricingMatrix")}
        >
          <Text style={styles.buttonText}>View Plans and Pricing</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.secondary]}
          onPress={() => navigation.navigate("Subscription")}
        >
          <Text style={[styles.buttonText, styles.secondaryText]}>Manage Subscription</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    gap: 6
  },
  label: { fontSize: 12, color: "#64748b" },
  value: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  button: {
    backgroundColor: "#15803d",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonText: { color: "#fff", fontWeight: "800" },
  secondary: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#16a34a" },
  secondaryText: { color: "#166534" }
});
