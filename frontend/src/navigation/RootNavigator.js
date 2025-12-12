import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import MainTabs from "./MainTabs";
import GrowJournalScreen from "../screens/GrowJournalScreen";
import SubscribeScreen from "../screens/SubscribeScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="GrowJournal" component={GrowJournalScreen} />
      <Stack.Screen name="Subscribe" component={SubscribeScreen} />
    </Stack.Navigator>
  );
}
