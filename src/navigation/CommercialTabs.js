import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import StorefrontScreen from "../screens/StorefrontScreen";
import CommercialToolsScreen from "../screens/commercial/CommercialToolsScreen";
import CommercialReportsScreen from "../screens/commercial/CommercialReportsScreen";
import CommercialProfileScreen from "../screens/commercial/CommercialProfileScreen";

const Tab = createBottomTabNavigator();

export default function CommercialTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Storefront" component={StorefrontScreen} options={{ title: "Storefront" }} />
      <Tab.Screen
        name="CommercialTools"
        component={CommercialToolsScreen}
        options={{ title: "Tools" }}
      />
      <Tab.Screen
        name="CommercialReports"
        component={CommercialReportsScreen}
        options={{ title: "Reports" }}
      />
      <Tab.Screen
        name="CommercialProfile"
        component={CommercialProfileScreen}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
