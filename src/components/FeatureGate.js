// FeatureGate.js
// Usage: <FeatureGate plan="pro">...</FeatureGate>
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/auth/AuthContext";

export default function FeatureGate({ plan = "pro", children, fallback, navigation }) {
  const { isPro, subscriptionStatus, isEntitled } = useAuth();

  // Add more plan logic as needed
  const hasAccess =
    (plan === "pro" && isPro) ||
    (plan === "creator" && isEntitled) ||
    (plan === "commercial" && subscriptionStatus === "commercial");

  if (hasAccess) return <>{children}</>;

  return (
    fallback || (
      <View style={{ alignItems: "center", margin: 32 }}>
        <Text style={{ fontSize: 16, color: "#888", marginBottom: 12 }}>
          This feature requires a {plan.charAt(0).toUpperCase() + plan.slice(1)} plan.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: "#10B981", padding: 12, borderRadius: 8 }}
          onPress={() => navigation?.navigate("Paywall")}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    )
  );
}
