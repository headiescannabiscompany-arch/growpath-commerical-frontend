import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import CommercialDashboardScreen from "../screens/commercial/CommercialDashboardScreen";
import CommercialGrowsRoute from "../app/home/commercial/grows";
import CommercialProductsRoute from "../app/home/commercial/products";
import CommercialFeedRoute from "../app/feed";
import CommercialProfileRoute from "../app/home/commercial/profile";

const Tab = createBottomTabNavigator();

export default function CommercialTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen
        name="CommercialDashboard"
        component={CommercialDashboardScreen}
        options={{ title: "Dashboard" }}
      />
      <Tab.Screen
        name="CommercialGrows"
        component={CommercialGrowsRoute}
        options={{ title: "Grows & Trials" }}
      />
      <Tab.Screen
        name="CommercialProducts"
        component={CommercialProductsRoute}
        options={{ title: "Products" }}
      />
      <Tab.Screen
        name="CommercialFeed"
        component={CommercialFeedRoute}
        options={{ title: "Feed" }}
      />
      <Tab.Screen
        name="CommercialProfile"
        component={CommercialProfileRoute}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
