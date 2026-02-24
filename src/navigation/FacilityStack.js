import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import FacilityTabs from "./FacilityTabs";
import GuildCodeScreen from "../screens/GuildCodeScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import PricingMatrixScreen from "../screens/PricingMatrixScreen";
import ForumNewPostScreen from "../screens/ForumNewPostScreen";
import { ForumPostDetailScreen } from "../screens/ForumPostDetailScreen";

const Stack = createNativeStackNavigator();

export default function FacilityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="FacilityTabs"
        component={FacilityTabs}
        options={{ title: "Facility" }}
      />
      <Stack.Screen name="GuildCode" component={GuildCodeScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="PricingMatrix" component={PricingMatrixScreen} />
      <Stack.Screen name="ForumNewPost" component={ForumNewPostScreen} />
      <Stack.Screen name="ForumPostDetail" component={ForumPostDetailScreen} />
      <Stack.Screen name="ForumPost" component={ForumPostDetailScreen} />
    </Stack.Navigator>
  );
}
