import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FacilityTabs from "./FacilityTabs";
import StubScreen from "../components/StubScreen";

const Stack = createNativeStackNavigator();

function makeStub(title) {
  return function Screen(props) {
    return <StubScreen {...props} title={title} subtitle="Facility stub" />;
  };
}

export default function FacilityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      {/* Root */}
      <Stack.Screen
        name="FacilityTabs"
        component={FacilityTabs}
        options={{ title: "Facility" }}
      />
      {/* Common “missing” screens you were navigating to */}
      <Stack.Screen name="GuildCode" component={makeStub("Guild Code")} />
      <Stack.Screen name="Subscription" component={makeStub("Subscription")} />
      <Stack.Screen name="PricingMatrix" component={makeStub("Pricing Matrix")} />
      {/* Forum-related */}
      <Stack.Screen name="ForumNewPost" component={makeStub("Forum: New Post")} />
      <Stack.Screen name="ForumPost" component={makeStub("Forum: Post")} />
    </Stack.Navigator>
  );
}
