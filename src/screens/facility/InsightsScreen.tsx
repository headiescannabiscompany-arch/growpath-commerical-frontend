import React from "react";
import { View, Text } from "react-native";

export default function InsightsScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Insights</Text>
      <Text style={{ marginTop: 8, opacity: 0.7 }}>Insights module is planned for this shell.</Text>
    </View>
  );
}
