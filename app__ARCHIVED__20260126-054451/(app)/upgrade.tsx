import React from "react";
import { logEvent } from "../../src/api/events";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth/AuthContext";

export default function UpgradeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const plan = user?.plan || "free";

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, marginBottom: 12 }}>Upgrade</Text>
      <Text style={{ opacity: 0.8, marginBottom: 24 }}>
        Current plan: {plan}. This feature requires a commercial or facility account.
      </Text>
      <Pressable
        onPress={() => {
          logEvent("UPGRADE_CLICK");
          router.push("/(app)/billing");
        }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          borderWidth: 1
        }}
      >
        <Text>View Plans</Text>
      </Pressable>
      <Pressable
        onPress={() => router.back()}
        style={{
          marginTop: 12,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 12,
          borderWidth: 1
        }}
      >
        <Text>Not now</Text>
      </Pressable>
    </View>
  );
}
