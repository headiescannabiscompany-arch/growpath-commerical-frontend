import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CommercialTabs from "./CommercialTabs";
import StubScreen from "../components/StubScreen";

const Stack = createNativeStackNavigator();

function makeStub(title) {
  return function Screen(props) {
    return <StubScreen {...props} title={title} subtitle="Commercial stub" />;
  };
}

export default function CommercialStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      {/* Root */}
      <Stack.Screen
        name="CommercialTabs"
        component={CommercialTabs}
        options={{ title: "Commercial" }}
      />
      {/* The ones in your warning log */}
      <Stack.Screen name="ForumNewPost" component={makeStub("Forum: New Post")} />
      <Stack.Screen name="CreateCourse" component={makeStub("Create Course")} />
      <Stack.Screen name="CommercialTools" component={makeStub("Commercial Tools")} />
      <Stack.Screen name="CommercialReports" component={makeStub("Commercial Reports")} />
      <Stack.Screen name="CommercialProfile" component={makeStub("Commercial Profile")} />
      {/* Other common routes */}
      <Stack.Screen name="GuildCode" component={makeStub("Guild Code")} />
      <Stack.Screen name="Subscription" component={makeStub("Subscription")} />
      <Stack.Screen name="PricingMatrix" component={makeStub("Pricing Matrix")} />
    </Stack.Navigator>
  );
}
