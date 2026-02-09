import React, { useMemo } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { toEntContext } from "@/entitlements/toEntContext";
import { uiGate } from "@/entitlements/uiGate";
import { CAP } from "@/entitlements/screenMatrix";

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function FacilityTabsLayout() {
  const auth = useAuth();
  const ent = useMemo(() => toEntContext(auth), [auth]);

  // Ensure gating is computed deterministically
  const teamGate = useMemo(
    () =>
      uiGate(ent, CAP.FAC_TEAM, {
        behaviorMissingCap: "hidden",
        behaviorMissingFacilityContext: "hidden",
        behaviorMissingRole: "hidden",
        allowedFacilityRoles: ["OWNER", "MANAGER"]
      }),
    [ent]
  );

  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: true,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: tabIcon("speedometer-outline")
        }}
      />
      <Tabs.Screen
        name="grows"
        options={{
          title: "Grows",
          tabBarIcon: tabIcon("flower-outline")
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          title: "Plants",
          tabBarIcon: tabIcon("leaf-outline")
        }}
      />
      <Tabs.Screen
        name="ai-tools"
        options={{
          title: "AI Tools",
          tabBarIcon: tabIcon("sparkles-outline")
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: tabIcon("checkmark-done-outline")
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: "Logs",
          tabBarIcon: tabIcon("document-text-outline")
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarIcon: tabIcon("cube-outline")
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          tabBarIcon: tabIcon("people-outline"),
          href: teamGate === "enabled" ? undefined : null
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: tabIcon("person-outline")
        }}
      />
    </Tabs>
  );
}
