import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import CommercialDashboardScreen from "../screens/commercial/CommercialDashboardScreen";
import CommercialCoursesRoute from "../app/home/commercial/courses";
import CommercialLivesRoute from "../app/home/commercial/lives";
import CommercialProductsRoute from "../app/home/commercial/products";
import CommercialFeedRoute from "../app/feed";
import CommercialProfileRoute from "../app/home/commercial/profile";
import StorefrontScreen from "../screens/StorefrontScreen";

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
        name="Storefront"
        component={StorefrontScreen}
        options={{ title: "Storefront" }}
      />
      <Tab.Screen
        name="CommercialProducts"
        component={CommercialProductsRoute}
        options={{ title: "Products" }}
      />
      <Tab.Screen
        name="CommercialCourses"
        component={CommercialCoursesRoute}
        options={{ title: "Courses" }}
      />
      <Tab.Screen
        name="CommercialLives"
        component={CommercialLivesRoute}
        options={{ title: "Lives" }}
      />
      <Tab.Screen
        name="CommercialFeed"
        component={CommercialFeedRoute}
        options={{ title: "Feed / Campaigns" }}
      />
      <Tab.Screen
        name="CommercialProfile"
        component={CommercialProfileRoute}
        options={{ title: "Profile" }}
      />
    </Tab.Navigator>
  );
}
