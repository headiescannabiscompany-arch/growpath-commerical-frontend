import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import CommercialDashboardScreen from "../screens/commercial/CommercialDashboardScreen";
import CommercialCoursesRoute from "../app/home/commercial/courses";
import CommercialLivesRoute from "../app/home/commercial/lives";
import CommercialOrdersRoute from "../app/home/commercial/orders";
import CommercialProductsRoute from "../app/home/commercial/products";
import CommercialFeedRoute from "../app/home/commercial/feed";
import CommercialProfileRoute from "../app/home/commercial/profile";
import CommercialStorefrontRoute from "../app/home/commercial/storefront";
import CommercialAnalyticsRoute from "../app/home/commercial/analytics";

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
        name="CommercialProfile"
        component={CommercialProfileRoute}
        options={{ title: "Setup" }}
      />
      <Tab.Screen
        name="CommercialProducts"
        component={CommercialProductsRoute}
        options={{ title: "Catalog" }}
      />
      <Tab.Screen
        name="Storefront"
        component={CommercialStorefrontRoute}
        options={{ title: "Storefront" }}
      />
      <Tab.Screen
        name="CommercialCourses"
        component={CommercialCoursesRoute}
        options={{ title: "Education" }}
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
        name="CommercialOrders"
        component={CommercialOrdersRoute}
        options={{ title: "Orders" }}
      />
      <Tab.Screen
        name="CommercialAnalytics"
        component={CommercialAnalyticsRoute}
        options={{ title: "Analytics" }}
      />
    </Tab.Navigator>
  );
}
