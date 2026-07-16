import React from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import ReportBugButton from "@/components/ReportBugButton";
import { useEntitlements } from "@/entitlements";

export default function PersonalTabsLayout() {
  const ent = useEntitlements();
  const pathname = usePathname();
  const hideTabBar =
    pathname.startsWith("/home/personal/tools/") && pathname !== "/home/personal/tools";

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
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <ReportBugButton workspace="personal" />,
        tabBarHideOnKeyboard: true,
        tabBarIcon: () => null,
        tabBarStyle: hideTabBar ? { display: "none" } : undefined
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="grows" options={{ title: "Grows" }} />
      <Tabs.Screen name="tools" options={{ title: "Tools" }} />
      <Tabs.Screen name="community" options={{ title: "Forum / Q&A" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="courses" options={{ title: "Courses", href: null }} />
      <Tabs.Screen name="ai" options={{ href: null, title: "AI Assistant" }} />
      <Tabs.Screen name="forum" options={{ href: null, title: "Forum / Q&A" }} />
      <Tabs.Screen name="diagnose" options={{ href: null, title: "Diagnose" }} />
      <Tabs.Screen name="logs" options={{ href: null }} />
      <Tabs.Screen name="tasks" options={{ href: null }} />
    </Tabs>
  );
}
