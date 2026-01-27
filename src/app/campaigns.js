import React from "react";
import { View, Text } from "react-native";

export default function CampaignsRoute() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>Campaigns</Text>
      <Text style={{ marginTop: 8, opacity: 0.7 }}>/campaigns route</Text>
    </View>
  );
}
