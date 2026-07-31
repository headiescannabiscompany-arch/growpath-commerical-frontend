import React from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import { useEntitlements } from "@/entitlements";
import { useAppTheme } from "@/theme/appTheme";

export default function PersonalTabsLayout() {
  const ent = useEntitlements();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { palette } = useAppTheme();
  const compactTabs = width < 760;
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
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarIcon: () => null,
        tabBarActiveTintColor: palette.tabActive,
        tabBarInactiveTintColor: palette.tabInactive,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: compactTabs ? 10 : 11,
          fontWeight: "700",
          lineHeight: compactTabs ? 12 : 13,
          textAlign: "center"
        },
        tabBarItemStyle: { flex: 1, minWidth: 0, paddingHorizontal: 0 },
        tabBarStyle: hideTabBar
          ? { display: "none" }
          : {
              backgroundColor: palette.tabBar,
              borderTopColor: palette.tabBarBorder,
              ...(compactTabs ? { height: 72, paddingBottom: 22, paddingTop: 4 } : {})
            }
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarLabel: "Home" }} />
      <Tabs.Screen name="grows" options={{ title: "Grows", tabBarLabel: "Grows" }} />
      <Tabs.Screen
        name="community"
        options={{ title: "Forum / Q&A", tabBarLabel: "Forum" }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: "Discovery Nature", tabBarLabel: "Nature" }}
      />
      <Tabs.Screen name="more" options={{ title: "More", tabBarLabel: "More" }} />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
      <Tabs.Screen name="tools" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="courses" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen
        name="field-studies/index"
        options={{ href: null, tabBarButton: () => null, title: "Field Studies" }}
      />
      <Tabs.Screen
        name="field-studies/[studyId]"
        options={{ href: null, tabBarButton: () => null, title: "Field Study" }}
      />
      <Tabs.Screen
        name="ai"
        options={{ href: null, tabBarButton: () => null, title: "AI Assistant" }}
      />
      <Tabs.Screen
        name="forum"
        options={{ href: null, tabBarButton: () => null, title: "Forum / Q&A" }}
      />
      <Tabs.Screen
        name="diagnose"
        options={{ href: null, tabBarButton: () => null, title: "Diagnose" }}
      />
      <Tabs.Screen name="logs" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="tasks" options={{ href: null, tabBarButton: () => null }} />
    </Tabs>
  );
}
