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
      <Tabs.Screen name="tools" options={{ title: "Tools" }} />
      <Tabs.Screen name="community" options={{ title: "Community" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="ai" options={{ href: null }} />
      <Tabs.Screen name="forum" options={{ href: null }} />
      <Tabs.Screen name="logs" options={{ href: null }} />
      <Tabs.Screen name="courses" options={{ href: null }} />
      <Tabs.Screen name="diagnose" options={{ href: null }} />
      <Tabs.Screen name="tasks" options={{ href: null }} />
    </Tabs>
  );
}
