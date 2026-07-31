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
        tabBarShowIcon: false,
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { color: palette.text },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: compactTabs ? 10 : 12,
          fontWeight: "700",
          textAlign: "center",
          lineHeight: compactTabs ? 12 : 14,
          marginStart: 0,
          marginEnd: 0
        },
        tabBarItemStyle: { flex: 1, minWidth: 0, paddingHorizontal: compactTabs ? 2 : 6 },
        tabBarStyle: hideTabBar
          ? { display: "none" as const }
          : {
              backgroundColor: palette.tabBar,
              borderTopColor: palette.tabBarBorder,
              ...(compactTabs
                ? { height: 74, paddingBottom: 20, paddingHorizontal: 6, paddingTop: 6 }
                : {})
            }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Dashboard", tabBarLabel: "Dashboard" }}
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
      <Tabs.Screen
        name="courses"
        options={{ title: "Courses", tabBarLabel: "Courses" }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Forum / Q&A",
          tabBarLabel: "Forum",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
      <Tabs.Screen
        name="products/index"
        options={{ title: "Products", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed / Campaigns",
          tabBarButton: () => null,
          tabBarLabel: compactTabs ? "Feed" : "Feed / Campaigns",
          headerShown: false
        }}
      />
      <Tabs.Screen name="lives" options={{ title: "Lives", tabBarButton: () => null }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory Support",
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      {/* prettier-ignore */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="storefront/edit"
        options={{
          title: "Edit Storefront",
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="storefront/preview"
        options={{
          title: "Preview Storefront",
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="tools/library"
        options={{ title: "Tool Library", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="batch-planner"
        options={{
          title: "Product Batches",
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="product-lines"
        options={{
          title: "Product Lines",
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="trials"
        options={{
          title: "Product Trials",
          tabBarButton: () => null,
          headerShown: false
        }}
      />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", tabBarButton: () => null }} />
      <Tabs.Screen
        name="tasks/[id]"
        options={{ title: "Task Detail", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="marketing"
        options={{ title: "Marketing", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="inventory-create"
        options={{
          title: "Add Inventory Support Record",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="inventory/new"
        options={{
          title: "Add Inventory Support Record",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen name="inventory-item/[id]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="inventory/[id]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen
        name="grows/new"
        options={{
          tabBarButton: () => null,
          title: "Create Product Trial Evidence Run",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="grows/[growId]"
        options={{
          tabBarButton: () => null,
          title: "Product Trial Evidence Run Detail"
        }}
      />
      <Tabs.Screen
        name="evidence-runs/index"
        options={{
          tabBarButton: () => null,
          title: "Product Trial Evidence Runs",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="evidence-runs/new"
        options={{
          tabBarButton: () => null,
          title: "Create Product Trial Evidence Run",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="evidence-runs/[id]"
        options={{
          tabBarButton: () => null,
          title: "Product Trial Evidence Run Detail"
        }}
      />
      <Tabs.Screen
        name="products/new"
        options={{ title: "Create Product", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="products/import"
        options={{
          title: "Import Storefront Items",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="products/[productId]"
        options={{ title: "Product Detail", tabBarButton: () => null }}
      />
      <Tabs.Screen name="courses/[courseId]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen
        name="batch-planner/[batchId]"
        options={{ tabBarButton: () => null }}
      />
      <Tabs.Screen name="product-lines/[lineId]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="trials/[trialId]" options={{ tabBarButton: () => null }} />
      <Tabs.Screen
        name="tools/ask-ai"
        options={{ title: "Ask AI", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/diagnose"
        options={{ title: "Diagnose", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/environment"
        options={{ title: "Environment Review", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/recipe-builder"
        options={{
          title: "Soil & Nutrient Mix Builders",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="tools/npk"
        options={{ title: "Nutrient Mix Builder", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/soil-builder"
        options={{ title: "Soil Mix Builder", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/dry-amendment-mix"
        options={{ title: "Dry Amendment Mix", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/ingredient-library"
        options={{ title: "Ingredients", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/harvest-readiness"
        options={{ title: "Harvest Readiness", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/soil-nutrient-batch"
        options={{
          title: "Soil & Nutrient Batch Planner",
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="tools/report"
        options={{ title: "Export Report", tabBarButton: () => null }}
      />
    </Tabs>
  );
}
