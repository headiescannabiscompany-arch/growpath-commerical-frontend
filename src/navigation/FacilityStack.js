import BillingAndReportingScreen from "../screens/facility/BillingAndReportingScreen.js";
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FacilityTabs from "./FacilityTabs.js";
import FacilityPicker from "../screens/facility/FacilityPicker.js";
import RoomDetail from "../screens/facility/RoomDetail.js";
import GreenWasteScreen from "../screens/facility/GreenWasteScreen.js";
import AuditLogScreen from "../screens/facility/AuditLogScreen.js";
import SOPTemplatesScreen from "../screens/facility/SOPTemplatesScreen.js";
import VerificationScreen from "../screens/facility/VerificationScreen.js";
import DeviationHandlingScreen from "../screens/facility/DeviationHandlingScreen.js";
import VendorDashboardScreen from "../screens/facility/VendorDashboardScreen.js";
import EquipmentToolsScreen from "../screens/facility/EquipmentToolsScreen.js";
import { useAuth } from "../context/AuthContext.js";

const Stack = createNativeStackNavigator();

const FacilityStack = () => {
  const { mode } = useAuth();
  const isCommercial = mode === "commercial";
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb"
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "600",
          color: "#1f2937"
        },
        headerTintColor: "#0ea5e9",
        headerBackTitleVisible: false
      }}
    >
      <Stack.Screen
        name="FacilityTabs"
        component={FacilityTabs}
        options={{
          headerShown: false
        }}
      />
      <Stack.Group
        screenOptions={{
          presentation: "modal",
          animationEnabled: true
        }}
      >
        <Stack.Screen
          name="VendorDashboard"
          component={VendorDashboardScreen}
          options={{ title: "Vendor Dashboard" }}
        />
        <Stack.Screen
          name="EquipmentTools"
          component={EquipmentToolsScreen}
          options={{ title: "Equipment Tools" }}
        />
        {!isCommercial && (
          <>
            <Stack.Screen
              name="FacilityPicker"
              component={FacilityPicker}
              options={{
                title: "Select a Facility"
              }}
            />
            <Stack.Screen
              name="GreenWaste"
              component={GreenWasteScreen}
              options={{ title: "Green Waste" }}
            />
            <Stack.Screen
              name="AuditLog"
              component={AuditLogScreen}
              options={{ title: "Audit Logs" }}
            />
            <Stack.Screen
              name="SOPTemplates"
              component={SOPTemplatesScreen}
              options={{ title: "SOP Templates" }}
            />
            <Stack.Screen
              name="BillingAndReporting"
              component={BillingAndReportingScreen}
              options={{ title: "Billing & Reporting" }}
            />
            <Stack.Screen
              name="Verification"
              component={VerificationScreen}
              options={{ title: "Task Verification" }}
            />
            <Stack.Screen
              name="DeviationHandling"
              component={DeviationHandlingScreen}
              options={{ title: "Deviation Handling" }}
            />
          </>
        )}
      </Stack.Group>
      {!isCommercial && (
        <Stack.Screen
          name="RoomDetail"
          component={RoomDetail}
          options={({ route }) => ({
            title: route.params?.roomId ? "Room Details" : "Room"
          })}
        />
      )}
    </Stack.Navigator>
  );
};

export default FacilityStack;
