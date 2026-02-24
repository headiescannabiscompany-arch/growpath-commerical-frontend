import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CommercialTabs from "./CommercialTabs";
import GuildCodeScreen from "../screens/GuildCodeScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import PricingMatrixScreen from "../screens/PricingMatrixScreen";
import ForumNewPostScreen from "../screens/ForumNewPostScreen";
import { ForumPostDetailScreen } from "../screens/ForumPostDetailScreen";
import CreateCourseScreen from "../screens/commercial/CreateCourseScreen";
import CommercialToolsScreen from "../screens/commercial/CommercialToolsScreen";
import CommercialReportsScreen from "../screens/commercial/CommercialReportsScreen";
import CommercialProfileScreen from "../screens/commercial/CommercialProfileScreen";
import SocialToolsScreen from "../screens/SocialToolsScreen";
import MarketplaceIntegrationScreen from "../screens/commercial/MarketplaceIntegrationScreen";
import AdvertisingScreen from "../screens/commercial/AdvertisingScreen";

const Stack = createNativeStackNavigator();

export default function CommercialStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="CommercialTabs"
        component={CommercialTabs}
        options={{ title: "Commercial" }}
      />
      <Stack.Screen name="ForumNewPost" component={ForumNewPostScreen} />
      <Stack.Screen name="ForumPostDetail" component={ForumPostDetailScreen} />
      <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
      <Stack.Screen name="CommercialTools" component={CommercialToolsScreen} />
      <Stack.Screen name="CommercialReports" component={CommercialReportsScreen} />
      <Stack.Screen name="CommercialProfile" component={CommercialProfileScreen} />
      <Stack.Screen name="SocialTools" component={SocialToolsScreen} />
      <Stack.Screen
        name="MarketplaceIntegration"
        component={MarketplaceIntegrationScreen}
      />
      <Stack.Screen name="Advertising" component={AdvertisingScreen} />
      <Stack.Screen name="GuildCode" component={GuildCodeScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="PricingMatrix" component={PricingMatrixScreen} />
    </Stack.Navigator>
  );
}
