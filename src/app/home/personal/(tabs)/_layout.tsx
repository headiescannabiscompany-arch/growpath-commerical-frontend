import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

function tabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function PersonalTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: tabIcon("leaf-outline")
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
        name="logs"
        options={{
          title: "Logs",
          tabBarIcon: tabIcon("document-text-outline")
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: "Tools",
          tabBarIcon: tabIcon("hammer-outline")
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: tabIcon("person-outline")
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "AI",
          tabBarIcon: tabIcon("sparkles-outline")
        }}
      />
    </Tabs>
  );
}
