import React from "react";
import { View, Text } from "react-native";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { ErrorBoundary } from "@/components/system/ErrorBoundary";
import { useRouter } from "expo-router";

export default function PersonalLogsRoute() {
  const router = useRouter();

  return (
    <ScreenBoundary name="personal.tabs.logs">
      <ErrorBoundary>
        <View style={{ flex: 1, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "900" }}>Logs</Text>
          <Text>
            Personal logs are not enabled in v1. Logging is facility-scoped so it can link
            to rooms, grows, tasks, photos, and AI receipts.
          </Text>

          <Text style={{ opacity: 0.75 }}>
            Tip: Switch to Facility mode to view Grow Logs.
          </Text>

          <Text
            onPress={() => router.push("/home/facility" as any)}
            style={{ fontWeight: "900", textDecorationLine: "underline" }}
          >
            Go to Facility
          </Text>
        </View>
      </ErrorBoundary>
    </ScreenBoundary>
  );
}

export default function LogsRoute() {
  return (
    <ErrorBoundary>
      <LogsScreen />
    </ErrorBoundary>
  );
}
