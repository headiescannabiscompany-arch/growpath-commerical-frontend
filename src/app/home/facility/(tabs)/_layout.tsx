import React from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";
import { useAppTheme } from "@/theme/appTheme";

export const FACILITY_TASKS_TAB_LABEL = "Tasks";
export const FACILITY_COMPLIANCE_TAB_LABEL = "Compliance";
export const FACILITY_GROWS_TAB_LABEL = "Grows";

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

export function shouldShowFacilityRouteHeader(routeName = "") {
  return ![
    "more",
    "ai-template",
    "ai-diagnosis-photo",
    "ai-tools",
    "reports",
    "analytics",
    "integrations",
    "team",
    "transfers",
    "rooms",
    "tasks",
    "compliance",
    "grows"
  ].includes(routeName);
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
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: compactTabs ? 9 : 10,
          fontWeight: "700",
          textAlign: "center"
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
        name="dashboard"
        options={{ title: "Dashboard", tabBarLabel: "Dashboard" }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: "Facility Rooms & Workspaces",
          headerShown: shouldShowFacilityRouteHeader("rooms"),
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="grows"
        options={{
          title: "Facility Grows",
          tabBarLabel: FACILITY_GROWS_TAB_LABEL,
          headerShown: shouldShowFacilityRouteHeader("grows")
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{ title: "Plants", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Facility Tasks",
          tabBarLabel: FACILITY_TASKS_TAB_LABEL,
          headerShown: shouldShowFacilityRouteHeader("tasks")
        }}
      />
      <Tabs.Screen
        name="sop-runs"
        options={{ title: "SOPs", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="compliance"
        options={{
          title: "Facility Compliance",
          tabBarLabel: FACILITY_COMPLIANCE_TAB_LABEL,
          headerShown: shouldShowFacilityRouteHeader("compliance")
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
        options={{
          title: "Licensed Sales & Transfers",
          headerShown: shouldShowFacilityRouteHeader("transfers"),
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Facility Team",
          headerShown: shouldShowFacilityRouteHeader("team"),
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Facility Reports",
          headerShown: shouldShowFacilityRouteHeader("reports"),
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Facility Analytics",
          headerShown: shouldShowFacilityRouteHeader("analytics"),
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="integrations"
        options={{
          title: "Connect rooms and sensor data",
          headerShown: shouldShowFacilityRouteHeader("integrations"),
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="ai-tools"
        options={{
          title: "Facility Grow Intelligence",
          headerShown: shouldShowFacilityRouteHeader("ai-tools"),
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="ai-ask"
        options={{ title: "AI", tabBarLabel: "AI", tabBarButton: () => null }}
      />
      <Tabs.Screen
        name="more"
        options={{ title: "More", headerShown: shouldShowFacilityRouteHeader("more") }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarLabel: "Profile" }}
      />
      <Tabs.Screen
        name="ai-diagnosis-photo"
        options={{
          title: "Plant Issue Diagnosis",
          headerShown: shouldShowFacilityRouteHeader("ai-diagnosis-photo"),
          tabBarButton: () => null
        }}
      />
      <Tabs.Screen
        name="ai-template"
        options={{
          title: "AI Templates",
          headerShown: shouldShowFacilityRouteHeader("ai-template"),
          tabBarButton: () => null
        }}
      />
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
