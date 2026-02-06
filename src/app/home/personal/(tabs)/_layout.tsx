import React from "react";
import { Tabs } from "expo-router";

export default function PersonalTabsLayout() {
  console.log("[TABS] personal tabs layout mounted");
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="grows" options={{ title: "Grows" }} />
      <Tabs.Screen name="logs" options={{ title: "Logs" }} />
      <Tabs.Screen name="tools" options={{ title: "Tools" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
