import React, { useState } from "react";
import { View, Text, Pressable, Switch } from "react-native";
import { useRouter } from "expo-router";

import RequireAuth from "../../src/auth/RequireAuth";

export default function NotificationSettingsScreen() {
  const router = useRouter();

  // MVP toggles (wire to backend later)
  const [pushEnabled, setPushEnabled] = useState(true);
  const [interestOnly, setInterestOnly] = useState(true);

  return (
    <RequireAuth>
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 12 }}>
          <Text style={{ opacity: 0.7 }}>← Back</Text>
        </Pressable>

        <Text style={{ fontSize: 22, marginBottom: 12 }}>Notification Settings</Text>

        <View style={{ borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12
            }}
          >
            <Text style={{ fontSize: 16 }}>Push notifications</Text>
            <Switch value={pushEnabled} onValueChange={setPushEnabled} />
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <Text style={{ fontSize: 16 }}>Only notify for my interests</Text>
            <Switch value={interestOnly} onValueChange={setInterestOnly} />
          </View>

          <Text style={{ marginTop: 12, opacity: 0.7, fontSize: 12 }}>
            (MVP) These toggles are UI-only right now. Wire to backend when ready.
          </Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 12,
            borderWidth: 1
          }}
        >
          <Text>Done</Text>
        </Pressable>
      </View>
    </RequireAuth>
  );
}
