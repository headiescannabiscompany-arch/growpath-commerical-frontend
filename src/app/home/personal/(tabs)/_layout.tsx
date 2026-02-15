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

  return <Tabs screenOptions={{ headerShown: true, tabBarHideOnKeyboard: true }} />;
}
