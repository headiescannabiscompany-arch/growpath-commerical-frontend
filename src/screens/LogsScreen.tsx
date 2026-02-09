import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

export default function LogsScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>Logs</Text>

      <Text>
        This tab is wired but the Logs surface hasn’t been finalized yet. It will be
        connected to Grow Log Entries (facility) and/or Personal Logs.
      </Text>

      <TouchableOpacity
        onPress={() => router.push("/home/facility" as any)}
        style={{
          marginTop: 16,
          padding: 12,
          borderWidth: 1,
          borderRadius: 8,
          alignSelf: "flex-start"
        }}
      >
        <Text style={{ fontWeight: "700" }}>Go to Facility</Text>
      </TouchableOpacity>
    </View>
  );
}
