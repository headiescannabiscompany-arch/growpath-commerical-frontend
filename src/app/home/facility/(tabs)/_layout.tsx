import React from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import { useEntitlements } from "@/entitlements";
import { getWorkspaceTabOptions } from "@/navigation/workspaceTabOptions";
import { useFacility } from "@/state/useFacility";
import { useAppTheme } from "@/theme/appTheme";

export function shouldHideFacilityTabBar(pathname = "") {
  return (
    pathname.includes("/ai-diagnosis-photo") ||
    pathname.includes("/ai-template") ||
    pathname.includes("/inventory/new") ||
    pathname.includes("/inventory/") ||
    pathname.includes("/tools/") ||
    pathname.includes("/CreateInventoryItemScreen") ||
    pathname.includes("/InventoryItemDetailScreen")
  );
}

export default function FacilityTabsLayout() {
  const ent = useEntitlements();
  const { selectedId } = useFacility();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { palette } = useAppTheme();
  const compactTabs = width < 700;
  const hideTabBar = shouldHideFacilityTabBar(pathname);

  if (!ent?.ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (ent.mode !== "facility") {
    return <Redirect href="/home/personal" />;
  }

  if (!selectedId && !ent.facilityId) {
    return <Redirect href="/home/facility/select" />;
  }

  return (
    <Tabs
      screenOptions={getWorkspaceTabOptions({
        compact: compactTabs,
        headerShown: true,
        hideTabBar,
        palette
      })}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarLabel: "Dashboard" }}
      />
      <Tabs.Screen name="grows" options={{ title: "Grows", tabBarLabel: "Grows" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", tabBarLabel: "Tasks" }} />
      <Tabs.Screen
        name="compliance"
        options={{ title: "Compliance", tabBarLabel: "Compliance" }}
      />
      <Tabs.Screen name="more" options={{ title: "More", tabBarLabel: "More" }} />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
      <Tabs.Screen name="rooms" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="plants" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="sop-runs" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen
        name="logs"
        options={{ title: "Logs", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="audit-logs"
        options={{ title: "Audit", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: "Inventory", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="transfers"
        options={{ title: "Sales", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen name="team" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="reports" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen name="analytics" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen
        name="integrations"
        options={{ href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen name="ai-tools" options={{ href: null, tabBarButton: () => null }} />
      <Tabs.Screen
        name="ai-ask"
        options={{ title: "AI", tabBarLabel: "AI", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="ai-diagnosis-photo"
        options={{ title: "Trichome Analysis", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="ai-template"
        options={{ href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="ai-validation"
        options={{ title: "AI QA", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="CreateInventoryItemScreen"
        options={{ title: "Create Inventory Item", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="InventoryItemDetailScreen"
        options={{ title: "Inventory Item", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/environment"
        options={{ title: "Environment Review", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/pulse"
        options={{ title: "Connect Pulse", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/history-import"
        options={{ title: "Import Grow History", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/recipe-builder"
        options={{
          title: "Soil & Nutrient Mix Builders",
          href: null,
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="tools/dry-amendment-mix"
        options={{ title: "Dry Amendment Mix", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/ingredient-library"
        options={{ title: "Ingredients", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/npk"
        options={{ title: "Nutrient Mix Builder", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/soil-builder"
        options={{ title: "Soil Mix Builder", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/feeding-schedule"
        options={{ title: "Feeding Schedule", href: null, tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/harvest-readiness"
        options={{ title: "Harvest Readiness", href: null, tabBarButton: () => null }}
      />
    </Tabs>
  );
}
