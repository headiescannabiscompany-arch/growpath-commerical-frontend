import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import FacilityHomeScreen from "../screens/facility/FacilityHomeScreen";
import FacilityDashboardScreen from "../screens/facility/FacilityDashboardScreen";
import FacilityTasksScreen from "../screens/facility/FacilityTasksScreen";
import FacilityTeamScreen from "../screens/facility/FacilityTeamScreen";
import FacilitySettingsScreen from "../screens/facility/FacilitySettingsScreen";
import ComplianceLogsScreen from "../screens/facility/ComplianceLogsScreen";
import AutomationCenterScreen from "../screens/facility/AutomationCenterScreen";
import NotificationsCenterScreen from "../screens/facility/NotificationsCenterScreen";
import WebhooksScreen from "../screens/facility/WebhooksScreen";
import InsightsScreen from "../screens/facility/InsightsScreen";

import FacilityGuard from "../guards/FacilityGuard";

export type FacilityStackParamList = {
  FacilityHome: undefined;
  FacilityDashboard: undefined;
  FacilityTasks: undefined;
  FacilityTeam: undefined;
  FacilitySettings: undefined;
  ComplianceLogs: undefined;
  AutomationCenter: undefined;
  NotificationsCenter: undefined;
  Webhooks: undefined;
  Insights: undefined;
};

const Stack = createNativeStackNavigator<FacilityStackParamList>();

export default function FacilityNavigator() {
  return (
    <FacilityGuard>
      <Stack.Navigator>
        <Stack.Screen
          name="FacilityHome"
          component={FacilityHomeScreen}
          options={{ title: "Facility" }}
        />
        <Stack.Screen
          name="FacilityDashboard"
          component={FacilityDashboardScreen}
          options={{ title: "Dashboard" }}
        />
        <Stack.Screen
          name="FacilityTasks"
          component={FacilityTasksScreen}
          options={{ title: "Tasks" }}
        />
        <Stack.Screen
          name="FacilityTeam"
          component={FacilityTeamScreen}
          options={{ title: "Team" }}
        />
        <Stack.Screen
          name="FacilitySettings"
          component={FacilitySettingsScreen}
          options={{ title: "Settings" }}
        />
        <Stack.Screen
          name="ComplianceLogs"
          component={ComplianceLogsScreen}
          options={{ title: "Compliance" }}
        />
        <Stack.Screen
          name="AutomationCenter"
          component={AutomationCenterScreen}
          options={{ title: "Automation" }}
        />
        <Stack.Screen
          name="NotificationsCenter"
          component={NotificationsCenterScreen}
          options={{ title: "Notifications" }}
        />
        <Stack.Screen
          name="Webhooks"
          component={WebhooksScreen}
          options={{ title: "Webhooks" }}
        />
        <Stack.Screen
          name="Insights"
          component={InsightsScreen}
          options={{ title: "Insights" }}
        />
      </Stack.Navigator>
    </FacilityGuard>
  );
}
