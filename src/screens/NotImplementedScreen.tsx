import React from "react";
import { View, Text } from "react-native";

export default function NotImplementedScreen({
  title = "Coming soon"
}: {
  title?: string;
}) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>{title}</Text>
      <Text style={{ opacity: 0.8 }}>
        This screen exists to prevent bundler crashes while we iterate.
      </Text>
    </View>
  );
}
