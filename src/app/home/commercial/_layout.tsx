import React from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import { useEntitlements } from "@/entitlements";

export default function CommercialTabsLayout() {
  const ent = useEntitlements();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const compactTabs = width < 760;
  const hideTabBar =
    pathname.includes("/inventory-create") ||
    pathname.includes("/inventory-item/") ||
    pathname.includes("/products/new") ||
    pathname.includes("/products/") ||
    pathname.includes("/grows/new") ||
    pathname.includes("/grows/") ||
    pathname.includes("/courses/") ||
    pathname.includes("/batch-planner/") ||
    pathname.includes("/product-lines/") ||
    pathname.includes("/trials/");

  const tabBarStyle = hideTabBar
    ? { display: "none" as const }
    : compactTabs
      ? { height: 72, paddingBottom: 22, paddingTop: 4 }
      : undefined;

  if (!ent?.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (ent.mode !== "commercial") {
    return <Redirect href="/home" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarHideOnKeyboard: true,
        tabBarIcon: () => null,
        tabBarLabelStyle: { fontSize: compactTabs ? 11 : 10, fontWeight: "700" },
        tabBarStyle
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarLabel: compactTabs ? "Dash" : "Dashboard" }}
      />
      <Tabs.Screen
        name="grows"
        options={{ title: "Product Trial Evidence Runs", href: null }}
      />
      <Tabs.Screen name="storefront" options={{ title: "Storefront" }} />
      <Tabs.Screen name="products" options={{ title: "Products" }} />
      <Tabs.Screen name="courses" options={{ title: "Courses" }} />
      <Tabs.Screen name="lives" options={{ title: "Lives" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed / Campaigns" }} />
      <Tabs.Screen
        name="inventory"
        options={{ title: "Inventory Support", href: null }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: "Analytics", href: compactTabs ? null : undefined }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen
        name="batch-planner"
        options={{ title: "Product Batches", href: null }}
      />
      <Tabs.Screen
        name="product-lines"
        options={{ title: "Product Lines", href: null }}
      />
      <Tabs.Screen name="trials" options={{ title: "Product Trials", href: null }} />
      <Tabs.Screen name="community" options={{ title: "Forum / Q&A", href: null }} />
      <Tabs.Screen name="marketing" options={{ href: null, title: "Marketing" }} />
      <Tabs.Screen
        name="inventory-create"
        options={{ href: null, title: "Add Inventory Support Item" }}
      />
      <Tabs.Screen name="inventory-item/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="grows/new"
        options={{ href: null, title: "Create Product Trial Evidence Run" }}
      />
      <Tabs.Screen
        name="grows/[growId]"
        options={{ href: null, title: "Product Trial Evidence Run Detail" }}
      />
      <Tabs.Screen
        name="products/new"
        options={{ href: null, title: "Create Product" }}
      />
      <Tabs.Screen
        name="products/[productId]"
        options={{ href: null, title: "Product Detail" }}
      />
      <Tabs.Screen name="courses/[courseId]" options={{ href: null }} />
      <Tabs.Screen name="batch-planner/[batchId]" options={{ href: null }} />
      <Tabs.Screen name="product-lines/[lineId]" options={{ href: null }} />
      <Tabs.Screen name="trials/[trialId]" options={{ href: null }} />
    </Tabs>
  );
}
