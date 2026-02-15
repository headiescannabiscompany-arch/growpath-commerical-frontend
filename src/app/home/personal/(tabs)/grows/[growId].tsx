import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

export default function GrowDetailScreen() {
  const { growId } = useLocalSearchParams<{ growId: string }>();

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Grow</Text>
      <Text style={{ opacity: 0.7, marginTop: 6 }}>ID: {growId}</Text>

      <View style={{ marginTop: 16, padding: 12, borderWidth: 1, borderRadius: 12 }}>
        <Text style={{ fontWeight: "700" }}>Next wiring steps</Text>
        <Text style={{ opacity: 0.7, marginTop: 6 }}>
          Attach plants, logs, and tool outputs to this grow.
        </Text>
      </View>
    </View>
  );
}
