import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import CommercialDashboardScreen from "../screens/commercial/CommercialDashboardScreen";
import CommercialGrowsRoute from "../app/home/commercial/grows";
import CommercialToolsRoute from "../app/home/commercial/tools";
import CommercialDiscoverRoute from "../app/home/commercial/discover";
import CommercialCoursesRoute from "../app/home/commercial/courses";
import CommercialCommunityRoute from "../app/home/commercial/community";
import CommercialProfileRoute from "../app/home/commercial/profile";
import CommercialStorefrontRoute from "../app/home/commercial/storefront";
import CommercialProductsRoute from "../app/home/commercial/products";
import CommercialFeedRoute from "../app/home/commercial/feed";
import CommercialLivesRoute from "../app/home/commercial/lives";
import CommercialOrdersRoute from "../app/home/commercial/orders";
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
        name="Storefront"
        component={CommercialStorefrontRoute}
        options={{ title: "Storefront" }}
      />
      <Tab.Screen
        name="CommercialGrows"
        component={CommercialGrowsRoute}
        options={{ title: "Grows" }}
      />
      <Tab.Screen
        name="CommercialTools"
        component={CommercialToolsRoute}
        options={{ title: "AI Tools" }}
      />
      <Tab.Screen
        name="CommercialDiscover"
        component={CommercialDiscoverRoute}
        options={{ title: "Discover" }}
      />
      <Tab.Screen
        name="CommercialCourses"
        component={CommercialCoursesRoute}
        options={{ title: "Courses" }}
      />
      <Tab.Screen
        name="CommercialCommunity"
        component={CommercialCommunityRoute}
        options={{ title: "Forum / Q&A" }}
      />
      <Tab.Screen
        name="CommercialProfile"
        component={CommercialProfileRoute}
        options={{ title: "Profile" }}
      />
      <Tab.Screen
        name="CommercialProducts"
        component={CommercialProductsRoute}
        options={{ title: "Products", tabBarButton: () => null }}
      />
      <Tab.Screen
        name="CommercialFeed"
        component={CommercialFeedRoute}
        options={{ title: "Feed / Campaigns", tabBarButton: () => null }}
      />
      <Tab.Screen
        name="CommercialLives"
        component={CommercialLivesRoute}
        options={{ title: "Lives", tabBarButton: () => null }}
      />
      <Tab.Screen
        name="CommercialOrders"
        component={CommercialOrdersRoute}
        options={{ title: "Orders", tabBarButton: () => null }}
      />
      <Tab.Screen
        name="CommercialAnalytics"
        component={CommercialAnalyticsRoute}
        options={{ title: "Analytics", tabBarButton: () => null }}
      />
    </Tab.Navigator>
  );
}
