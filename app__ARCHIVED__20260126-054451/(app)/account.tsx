import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

import RequireAuth from "../../src/auth/RequireAuth";
import { useAuth } from "../../src/auth/AuthContext";

export default function AccountScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <RequireAuth>
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        <Text style={{ fontSize: 22, marginBottom: 12 }}>Account</Text>

        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, marginBottom: 6 }}>
            {user?.displayName || "User"}
          </Text>
          <Text style={{ opacity: 0.8 }}>{user?.email}</Text>
          <Text style={{ marginTop: 10 }}>Role: {user?.role || "user"}</Text>
          <Text>Plan: {user?.plan || "free"}</Text>
          <Text>Status: {user?.subscriptionStatus || "n/a"}</Text>

          <Text style={{ marginTop: 10, opacity: 0.8 }}>
            Interests:{" "}
            {Array.isArray(user?.growInterests) ? user.growInterests.length : 0}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push("/(app)/interests")}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            marginBottom: 10
          }}
        >
          <Text>Edit Interests</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/notification-settings")}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            marginBottom: 10
          }}
        >
          <Text>Notification Settings</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/upgrade")}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1,
            marginBottom: 10
          }}
        >
          <Text>Upgrade</Text>
        </Pressable>

        <Pressable
          onPress={signOut}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1
          }}
        >
          <Text>Sign out</Text>
        </Pressable>
      </View>
    </RequireAuth>
  );
}
