import React from "react";
import { View, Text } from "react-native";

export default function FacilityDashboard() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Facility Dashboard</Text>
      <Text style={{ marginTop: 8, opacity: 0.7 }}>Use facility tabs to access live modules.</Text>
    </View>
  );
}
