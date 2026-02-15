import { useRouter } from "expo-router";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";

export default function PersonalTasksRoute() {
  const router = useRouter();
  return (
    <ErrorBoundary>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8 }}>Tasks</Text>
        <Text>
          Personal tasks are not enabled yet. In v1, operational tasks live under Facility
          mode.
        </Text>
        <Text style={{ marginTop: 12 }}>
          Tip: switch to a facility to view and complete tasks (STAFF+). VIEWER is
          read-only.
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
    </ErrorBoundary>
  );
}
