import React from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import { useEntitlements } from "@/entitlements";
import { useAppTheme } from "@/theme/appTheme";

export default function CommercialTabsLayout() {
  const ent = useEntitlements();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { palette } = useAppTheme();
  const compactTabs = width < 760;
  const hideTabBar =
    pathname.includes("/inventory-create") ||
    pathname.includes("/inventory/new") ||
    pathname.includes("/inventory/") ||
    pathname.includes("/inventory-item/") ||
    pathname.includes("/storefront/") ||
    pathname.includes("/products/new") ||
    pathname.includes("/products/") ||
    pathname.includes("/evidence-runs/new") ||
    pathname.includes("/evidence-runs/") ||
    pathname.includes("/grows/new") ||
    pathname.includes("/grows/") ||
    pathname.includes("/courses/") ||
    pathname.includes("/batch-planner/") ||
    pathname.includes("/product-lines/") ||
    pathname.includes("/trials/") ||
    pathname.includes("/tools/");

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
        tabBarIconStyle: { display: "none" },
        tabBarLabelPosition: "beside-icon",
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { color: palette.text },
        tabBarLabelStyle: {
          fontSize: compactTabs ? 11 : 12,
          fontWeight: "700",
          marginStart: 0,
          marginEnd: 0
        },
        tabBarStyle: hideTabBar
          ? { display: "none" as const }
          : {
              backgroundColor: palette.tabBar,
              borderTopColor: palette.tabBarBorder,
              ...(compactTabs ? { height: 72, paddingBottom: 22, paddingTop: 4 } : {})
            }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarLabel: compactTabs ? "Dash" : "Dashboard" }}
      />
      <Tabs.Screen
        name="storefront/index"
        options={{ title: "Storefront", tabBarLabel: "Storefront" }}
      />
      <Tabs.Screen
        name="grows/index"
        options={{ title: "Grows", tabBarLabel: "Grows" }}
      />
      <Tabs.Screen
        name="tools/index"
        options={{ title: "AI Tools", tabBarLabel: "AI Tools" }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: "Discover", tabBarLabel: "Discover" }}
      />
      <Tabs.Screen name="courses" options={{ title: "Courses" }} />
      <Tabs.Screen
        name="community"
        options={{
          title: "Forum / Q&A",
          tabBarLabel: compactTabs ? "Forum" : "Forum / Q&A",
          headerShown: false
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen
        name="products/index"
        options={{ title: "Products", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed / Campaigns",
          href: null,
          tabBarButton: () => null,
          tabBarLabel: compactTabs ? "Feed" : "Feed / Campaigns",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="lives"
        options={{ title: "Lives", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          href: null,
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory Support",
          href: null,
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      {/* prettier-ignore */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          href: null,
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          href: null,
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="storefront/edit"
        options={{
          title: "Edit Storefront",
          href: null,
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="storefront/preview"
        options={{
          title: "Preview Storefront",
          href: null,
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="tools/library"
        options={{ href: null, title: "Tool Library", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="batch-planner"
        options={{
          title: "Product Batches",
          href: null,
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="product-lines"
        options={{
          title: "Product Lines",
          href: null,
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="trials"
        options={{
          title: "Product Trials",
          href: null,
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{ title: "Tasks", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tasks/[id]"
        options={{ title: "Task Detail", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="marketing"
        options={{ href: null, title: "Marketing", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="inventory-create"
        options={{
          href: null,
          title: "Add Inventory Support Record",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="inventory/new"
        options={{
          href: null,
          title: "Add Inventory Support Record",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="inventory-item/[id]"
        options={{ href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="inventory/[id]"
        options={{ href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="grows/new"
        options={{
          href: null,
          tabBarButton: () => null,
          title: "Create Product Trial Evidence Run",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="grows/[growId]"
        options={{
          href: null,
          tabBarButton: () => null,
          title: "Product Trial Evidence Run Detail"
        }}
      />
      <Tabs.Screen
        name="evidence-runs/index"
        options={{
          href: null,
          tabBarButton: () => null,
          title: "Product Trial Evidence Runs",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="evidence-runs/new"
        options={{
          href: null,
          tabBarButton: () => null,
          title: "Create Product Trial Evidence Run",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="evidence-runs/[id]"
        options={{
          href: null,
          tabBarButton: () => null,
          title: "Product Trial Evidence Run Detail"
        }}
      />
      <Tabs.Screen
        name="products/new"
        options={{ href: null, title: "Create Product", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="products/import"
        options={{
          href: null,
          title: "Import Storefront Items",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="products/[productId]"
        options={{ href: null, title: "Product Detail", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="courses/[courseId]"
        options={{ href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="batch-planner/[batchId]"
        options={{ href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="product-lines/[lineId]"
        options={{ href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="trials/[trialId]"
        options={{ href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/ask-ai"
        options={{ href: null, title: "Ask AI", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/diagnose"
        options={{ href: null, title: "Diagnose", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/environment"
        options={{ href: null, title: "Environment Review", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/recipe-builder"
        options={{
          href: null,
          title: "Soil & Nutrient Mix Builders",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="tools/npk"
        options={{ href: null, title: "Nutrient Mix Builder", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/soil-builder"
        options={{ href: null, title: "Soil Mix Builder", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/dry-amendment-mix"
        options={{ href: null, title: "Dry Amendment Mix", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/ingredient-library"
        options={{ href: null, title: "Ingredients", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/harvest-readiness"
        options={{ href: null, title: "Harvest Readiness", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/soil-nutrient-batch"
        options={{
          href: null,
          title: "Soil & Nutrient Batch Planner",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="tools/report"
        options={{ href: null, title: "Export Report", tabBarButton: () => null }}
      />
    </Tabs>
  );
}
