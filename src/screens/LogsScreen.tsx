import React from "react";
import { View, Text } from "react-native";

export default function LogsScreen() {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>Logs</Text>
      <Text style={{ opacity: 0.8 }}>
        Stub screen to keep routing stable. Will be wired later.
      </Text>
    </View>
  );
}
