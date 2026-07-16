import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import FacilityDashboardRoute from "../app/home/facility/(tabs)/dashboard";
import FacilityRoomsRoute from "../app/home/facility/(tabs)/rooms";
import FacilityGrowsRoute from "../app/home/facility/(tabs)/grows";
import FacilityInventoryRoute from "../app/home/facility/(tabs)/inventory";
import FacilityTasksRoute from "../app/home/facility/(tabs)/tasks";
import FacilityComplianceRoute from "../app/home/facility/(tabs)/compliance";
import FacilityTeamRoute from "../app/home/facility/(tabs)/team";
import FacilityReportsRoute from "../app/home/facility/(tabs)/reports";
import FacilityProfileRoute from "../app/home/facility/(tabs)/profile";

const Tab = createBottomTabNavigator();

export default function FacilityTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="FacilityDashboard"
        component={FacilityDashboardRoute}
        options={{ title: "Dashboard" }}
      />
      <Tab.Screen
        name="FacilityRooms"
        component={FacilityRoomsRoute}
        options={{ title: "Rooms" }}
      />
      <Tab.Screen
        name="FacilityTasks"
        component={FacilityTasksRoute}
        options={{ title: "Tasks" }}
      />
      <Tab.Screen
        name="FacilityCompliance"
        component={FacilityComplianceRoute}
        options={{ title: "Compliance" }}
      />
      <Tab.Screen
        name="FacilityProfile"
        component={FacilityProfileRoute}
        options={{ title: "Profile" }}
      />
      <Tab.Screen
        name="FacilityGrows"
        component={FacilityGrowsRoute}
        options={{ title: "Grows", tabBarButton: () => null }}
      />
      <Tab.Screen
        name="FacilityInventory"
        component={FacilityInventoryRoute}
        options={{ title: "Inventory", tabBarButton: () => null }}
      />
      <Tab.Screen
        name="FacilityTeam"
        component={FacilityTeamRoute}
        options={{ title: "Team", tabBarButton: () => null }}
      />
      <Tab.Screen
        name="FacilityReports"
        component={FacilityReportsRoute}
        options={{ title: "Reports", tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}
