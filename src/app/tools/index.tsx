import React from "react";
import { View, Text } from "react-native";

export default function Tools() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Tools</Text>
      <Text style={{ opacity: 0.8, marginTop: 8 }}>
        Stub screen (VPD, NPK, soil calc, etc.)
      </Text>
    </View>
  );
}
