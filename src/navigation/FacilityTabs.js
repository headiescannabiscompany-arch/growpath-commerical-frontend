import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import VendorDashboardScreen from "../screens/facility/VendorDashboardScreen";
import FacilityTasksScreen from "../screens/facility/FacilityTasksScreen";
import AuditLogScreen from "../screens/facility/AuditLogScreen";
import FacilitySettingsScreen from "../screens/facility/FacilitySettingsScreen";

const Tab = createBottomTabNavigator();

export default function FacilityTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="FacilityHome" component={VendorDashboardScreen} options={{ title: "Home" }} />
      <Tab.Screen name="FacilityTasks" component={FacilityTasksScreen} options={{ title: "Tasks" }} />
      <Tab.Screen name="FacilityReports" component={AuditLogScreen} options={{ title: "Reports" }} />
      <Tab.Screen
        name="FacilityProfile"
        component={FacilitySettingsScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
