import React from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import { ActivityIndicator, useWindowDimensions, View } from "react-native";

import ReportBugButton from "@/components/ReportBugButton";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/state/useFacility";

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
  const compactTabs = width < 700;
  const hideTabBar = shouldHideFacilityTabBar(pathname);
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
        headerRight: () => <ReportBugButton workspace="facility" />,
        tabBarHideOnKeyboard: true,
        tabBarIcon: () => null,
        tabBarLabelStyle: { fontSize: compactTabs ? 11 : 10, fontWeight: "700" },
        tabBarStyle
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Dashboard", tabBarLabel: compactTabs ? "Dash" : "Dashboard" }}
      />
      <Tabs.Screen name="rooms" options={{ title: "Rooms" }} />
      <Tabs.Screen name="grows" options={{ title: "Grows", href: null }} />
      <Tabs.Screen name="plants" options={{ title: "Plants", href: null }} />
      <Tabs.Screen name="logs" options={{ title: "Journal", href: null }} />
      <Tabs.Screen
        name="inventory"
        options={{ title: "Inventory", href: compactTabs ? null : undefined }}
      />
      <Tabs.Screen name="transfers" options={{ title: "Sales", href: null }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks" }} />
      <Tabs.Screen
        name="sop-runs"
        options={{ title: "SOPs", href: compactTabs ? null : undefined }}
      />
      <Tabs.Screen
        name="compliance"
        options={{
          title: "Compliance",
          tabBarLabel: compactTabs ? "Comp" : "Compliance"
        }}
      />
      <Tabs.Screen name="audit-logs" options={{ title: "Audit", href: null }} />
      <Tabs.Screen
        name="team"
        options={{ title: "Team", href: compactTabs ? null : undefined }}
      />
      <Tabs.Screen name="reports" options={{ title: "Reports", href: null }} />
      <Tabs.Screen
        name="integrations"
        options={{ title: "Integrations", href: compactTabs ? null : undefined }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          href: compactTabs ? null : undefined
        }}
      />
      <Tabs.Screen name="ai-tools" options={{ href: null }} />
      <Tabs.Screen name="ai-ask" options={{ title: "AI", tabBarLabel: "AI" }} />
      <Tabs.Screen
        name="ai-diagnosis-photo"
        options={{ title: "Trichome Analysis", tabBarButton: () => null }}
      />
      <Tabs.Screen name="ai-template" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="ai-validation" options={{ title: "AI QA", href: null }} />
      <Tabs.Screen
        name="CreateInventoryItemScreen"
        options={{ href: null, title: "Create Inventory Item" }}
      />
      <Tabs.Screen
        name="InventoryItemDetailScreen"
        options={{ href: null, title: "Inventory Item" }}
      />
      <Tabs.Screen
        name="tools/environment"
        options={{ href: null, title: "Environment Review" }}
      />
      <Tabs.Screen name="tools/pulse" options={{ href: null, title: "Connect Pulse" }} />
      <Tabs.Screen
        name="tools/history-import"
        options={{ href: null, title: "Import Grow History" }}
      />
      <Tabs.Screen
        name="tools/recipe-builder"
        options={{ href: null, title: "Recipe Builder" }}
      />
      <Tabs.Screen name="tools/npk" options={{ href: null, title: "NPK Recipe" }} />
      <Tabs.Screen
        name="tools/soil-builder"
        options={{ href: null, title: "Soil Builder" }}
      />
      <Tabs.Screen
        name="tools/feeding-schedule"
        options={{ href: null, title: "Feeding Schedule" }}
      />
      <Tabs.Screen
        name="tools/harvest-readiness"
        options={{ href: null, title: "Harvest Readiness" }}
      />
    </Tabs>
  );
}
