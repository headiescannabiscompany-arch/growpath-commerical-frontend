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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.page
        }}
      >
        <ActivityIndicator color={palette.accent} />
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
        tabBarActiveTintColor: palette.tabActive,
        tabBarInactiveTintColor: palette.tabInactive,
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { color: palette.text },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: compactTabs ? 9 : 12,
          fontWeight: "700",
          textAlign: "center",
          marginStart: 0,
          marginEnd: 0
        },
        tabBarItemStyle: { flex: 1, minWidth: 0 },
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
        options={{ title: "Dashboard", tabBarLabel: "Dashboard" }}
      />
      <Tabs.Screen
        name="storefront/index"
        options={{
          title: "Storefront",
          tabBarLabel: "Storefront",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="grows/index"
        options={{ title: "Grows", tabBarLabel: "Grows", href: null }}
      />
      <Tabs.Screen
        name="tools/index"
        options={{ title: "AI Tools", tabBarLabel: "AI Tools", href: null }}
      />
      <Tabs.Screen
        name="discover"
        options={{ title: "Discover", tabBarLabel: "Discover", href: null }}
      />
      <Tabs.Screen
        name="courses"
        options={{ title: "Courses", tabBarLabel: "Courses", href: null }}
      />
      <Tabs.Screen name="products/index" options={{ title: "Products", href: null }} />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed / Campaigns",
          tabBarLabel: compactTabs ? "Feed" : "Feed / Campaigns",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Forum / Q&A",
          tabBarLabel: "Forum",
          headerShown: false
        }}
      />
      <Tabs.Screen name="lives" options={{ title: "Lives", href: null }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory Support",
          href: null,
          headerShown: false
        }}
      />
      {/* prettier-ignore */}
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarLabel: "More",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
      <Tabs.Screen
        name="storefront/edit"
        options={{
          title: "Edit Storefront",
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="storefront/preview"
        options={{
          title: "Preview Storefront",
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen name="tools/library" options={{ title: "Tool Library", href: null }} />
      <Tabs.Screen
        name="batch-planner"
        options={{
          title: "Product Batches",
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="product-lines"
        options={{
          title: "Product Lines",
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="trials"
        options={{
          title: "Product Trials",
          href: null,
          headerShown: false
        }}
      />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", href: null }} />
      <Tabs.Screen name="tasks/[id]" options={{ title: "Task Detail", href: null }} />
      <Tabs.Screen name="marketing" options={{ title: "Marketing", href: null }} />
      <Tabs.Screen
        name="inventory-create"
        options={{
          title: "Add Inventory Support Record",
          href: null
        }}
      />
      <Tabs.Screen
        name="inventory/new"
        options={{
          title: "Add Inventory Support Record",
          href: null
        }}
      />
      <Tabs.Screen name="inventory-item/[id]" options={{ href: null }} />
      <Tabs.Screen name="inventory/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="grows/new"
        options={{
          href: null,
          title: "Create Product Trial Evidence Run",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="grows/[growId]"
        options={{
          href: null,
          title: "Product Trial Evidence Run Detail"
        }}
      />
      <Tabs.Screen
        name="evidence-runs/index"
        options={{
          href: null,
          title: "Product Trial Evidence Runs",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="evidence-runs/new"
        options={{
          href: null,
          title: "Create Product Trial Evidence Run",
          headerShown: false
        }}
      />
      <Tabs.Screen
        name="evidence-runs/[id]"
        options={{
          href: null,
          title: "Product Trial Evidence Run Detail"
        }}
      />
      <Tabs.Screen
        name="products/new"
        options={{ title: "Create Product", href: null }}
      />
      <Tabs.Screen
        name="products/import"
        options={{
          title: "Import Storefront Items",
          href: null
        }}
      />
      <Tabs.Screen
        name="products/[productId]"
        options={{ title: "Product Detail", href: null }}
      />
      <Tabs.Screen name="courses/[courseId]" options={{ href: null }} />
      <Tabs.Screen name="batch-planner/[batchId]" options={{ href: null }} />
      <Tabs.Screen name="product-lines/[lineId]" options={{ href: null }} />
      <Tabs.Screen name="trials/[trialId]" options={{ href: null }} />
      <Tabs.Screen name="tools/ask-ai" options={{ title: "Ask AI", href: null }} />
      <Tabs.Screen name="tools/diagnose" options={{ title: "Diagnose", href: null }} />
      <Tabs.Screen
        name="tools/environment"
        options={{ title: "Environment Review", href: null }}
      />
      <Tabs.Screen
        name="tools/recipe-builder"
        options={{
          title: "Soil & Nutrient Mix Builders",
          href: null
        }}
      />
      <Tabs.Screen
        name="tools/npk"
        options={{
          title: "Nutrient Mix Builder",
          headerShown: false,
          href: null
        }}
      />
      <Tabs.Screen
        name="tools/soil-builder"
        options={{
          title: "Soil Mix Builder",
          headerShown: false,
          href: null
        }}
      />
      <Tabs.Screen
        name="tools/dry-amendment-mix"
        options={{ title: "Dry Amendment Mix", href: null }}
      />
      <Tabs.Screen
        name="tools/ingredient-library"
        options={{
          title: "Products & Label Library",
          headerShown: false,
          href: null
        }}
      />
      <Tabs.Screen
        name="tools/harvest-readiness"
        options={{ title: "Harvest Readiness", href: null }}
      />
      <Tabs.Screen
        name="tools/soil-nutrient-batch"
        options={{
          title: "Soil & Nutrient Batch Planner",
          href: null
        }}
      />
      <Tabs.Screen name="tools/report" options={{ title: "Export Report", href: null }} />
    </Tabs>
  );
}
