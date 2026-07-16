import React from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import ReportBugButton from "@/components/ReportBugButton";
import { useEntitlements } from "@/entitlements";

export default function CommercialTabsLayout() {
  const ent = useEntitlements();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
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
        headerRight: () => <ReportBugButton workspace="commercial" />,
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
        name="grows/index"
        options={{ title: "Product Trial Evidence Runs", href: null }}
      />
      <Tabs.Screen name="storefront/index" options={{ title: "Storefront" }} />
      <Tabs.Screen
        name="storefront/edit"
        options={{ href: null, title: "Edit Storefront" }}
      />
      <Tabs.Screen
        name="storefront/preview"
        options={{ href: null, title: "Storefront Preview" }}
      />
      <Tabs.Screen name="products/index" options={{ title: "Products" }} />
      <Tabs.Screen name="feed" options={{ title: "Feed / Campaigns" }} />
      <Tabs.Screen
        name="courses"
        options={{ title: "Courses", href: compactTabs ? null : undefined }}
      />
      <Tabs.Screen
        name="lives"
        options={{ title: "Lives", href: compactTabs ? null : undefined }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Orders", href: compactTabs ? null : undefined }}
      />
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
        options={{ href: null, title: "Add Inventory Support Record" }}
      />
      <Tabs.Screen
        name="inventory/new"
        options={{ href: null, title: "Add Inventory Support Record" }}
      />
      <Tabs.Screen name="inventory-item/[id]" options={{ href: null }} />
      <Tabs.Screen name="inventory/[id]" options={{ href: null }} />
      <Tabs.Screen
        name="grows/new"
        options={{ href: null, title: "Create Product Trial Evidence Run" }}
      />
      <Tabs.Screen
        name="grows/[growId]"
        options={{ href: null, title: "Product Trial Evidence Run Detail" }}
      />
      <Tabs.Screen
        name="evidence-runs/index"
        options={{ href: null, title: "Product Trial Evidence Runs" }}
      />
      <Tabs.Screen
        name="evidence-runs/new"
        options={{ href: null, title: "Create Product Trial Evidence Run" }}
      />
      <Tabs.Screen
        name="evidence-runs/[id]"
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
      <Tabs.Screen name="tools/ask-ai" options={{ href: null, title: "Ask AI" }} />
      <Tabs.Screen name="tools/diagnose" options={{ href: null, title: "Diagnose" }} />
      <Tabs.Screen
        name="tools/environment"
        options={{ href: null, title: "Environment Review" }}
      />
      <Tabs.Screen
        name="tools/recipe-builder"
        options={{ href: null, title: "Recipe Builder" }}
      />
      <Tabs.Screen
        name="tools/harvest-readiness"
        options={{ href: null, title: "Harvest Readiness" }}
      />
      <Tabs.Screen name="tools/report" options={{ href: null, title: "Export Report" }} />
    </Tabs>
  );
}
