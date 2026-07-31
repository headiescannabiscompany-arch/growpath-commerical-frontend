import React from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import { useEntitlements } from "@/entitlements";
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
      screenOptions={{
        headerShown: true,
        tabBarHideOnKeyboard: true,
        tabBarIcon: () => null,
        headerStyle: { backgroundColor: palette.surface },
        headerTintColor: palette.text,
        headerTitleStyle: { color: palette.text },
        tabBarLabelStyle: { fontSize: compactTabs ? 11 : 10, fontWeight: "700" },
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
        name="dashboard"
        options={{ title: "Dashboard", tabBarLabel: compactTabs ? "Dash" : "Dashboard" }}
      />
      <Tabs.Screen name="rooms" options={{ title: "Rooms" }} />
      <Tabs.Screen name="grows" options={{ title: "Grows" }} />
      <Tabs.Screen name="plants" options={{ title: "Plants" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen name="sop-runs" options={{ title: "SOPs" }} />
      <Tabs.Screen
        name="compliance"
        options={{
          title: "Compliance",
          tabBarLabel: compactTabs ? "Comp" : "Compliance"
        }}
      />
      <Tabs.Screen name="logs" options={{ title: "Logs", tabBarButton: () => null }} />
      <Tabs.Screen
        name="audit-logs"
        options={{ title: "Audit", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: "Inventory", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="transfers"
        options={{ title: "Sales", tabBarButton: () => null }}
      />
      <Tabs.Screen name="team" options={{ title: "Team", tabBarButton: () => null }} />
      <Tabs.Screen
        name="reports"
        options={{ title: "Reports", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: "Analytics", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="integrations"
        options={{ title: "Integrations", tabBarButton: () => null }}
      />
      <Tabs.Screen name="ai-tools" options={{ href: compactTabs ? null : undefined }} />
      <Tabs.Screen
        name="ai-ask"
        options={{ title: "AI", tabBarLabel: "AI", tabBarButton: () => null }}
      />
      <Tabs.Screen name="more" options={{ title: "More" }} />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
      <Tabs.Screen
        name="ai-diagnosis-photo"
        options={{ title: "Trichome Analysis", tabBarButton: () => null }}
      />
      <Tabs.Screen name="ai-template" options={{ tabBarButton: () => null }} />
      <Tabs.Screen
        name="ai-validation"
        options={{ title: "AI QA", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="CreateInventoryItemScreen"
        options={{ title: "Create Inventory Item", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="InventoryItemDetailScreen"
        options={{ title: "Inventory Item", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/environment"
        options={{ title: "Environment Review", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/pulse"
        options={{ title: "Connect Pulse", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/history-import"
        options={{ title: "Import Grow History", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/recipe-builder"
        options={{
          title: "Soil & Nutrient Mix Builders",
          tabBarButton: () => null
        }}
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
        name="tools/npk"
        options={{ title: "Nutrient Mix Builder", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/soil-builder"
        options={{ title: "Soil Mix Builder", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/feeding-schedule"
        options={{ title: "Feeding Schedule", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tools/harvest-readiness"
        options={{ title: "Harvest Readiness", tabBarButton: () => null }}
      />
    </Tabs>
  );
}
