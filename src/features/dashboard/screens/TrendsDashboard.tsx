import React from "react";
import { View, Text } from "react-native";

export default function TrendsDashboard() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Trends Dashboard</Text>
      <Text style={{ marginTop: 8, opacity: 0.7 }}>Trend analytics are not wired yet.</Text>
    </View>
  );
}
