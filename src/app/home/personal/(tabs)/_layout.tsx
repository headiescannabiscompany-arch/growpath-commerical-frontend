import React from "react";
import { Tabs, Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { useEntitlements } from "@/entitlements";

export default function PersonalTabsLayout() {
  const ent = useEntitlements();

  if (!ent?.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (ent.mode !== "personal") {
    return <Redirect href="/home" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: true, tabBarHideOnKeyboard: true }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="grows" options={{ title: "Grows" }} />
      <Tabs.Screen name="logs" options={{ title: "Logs" }} />
      <Tabs.Screen name="tools" options={{ title: "Tools" }} />
      <Tabs.Screen name="courses" options={{ title: "Courses" }} />
      <Tabs.Screen name="forum" options={{ title: "Forum" }} />
      <Tabs.Screen name="diagnose" options={{ title: "Diagnose" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="ai" options={{ title: "AI" }} />
    </Tabs>
  );
}
