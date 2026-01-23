import React, { useMemo } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

// These should already exist in your project
import MainTabs from "./MainTabs";
import CommercialTabs from "./CommercialTabs";
import FacilityTabs from "./FacilityTabs";

// Optional: your auth screens if you have them
import LoginScreen from "../screens/LoginScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, user, mode } = useAuth();

  // Decide what the app should show when logged in
  const initialRouteName = useMemo(() => {
    if (!token) return "Login";
    if (mode === "commercial") return "CommercialTabs";
    if (mode === "facility") return "FacilityTabs";
    return "MainTabs"; // personal/default
  }, [token, mode]);

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      {/* Auth */}
      <Stack.Screen name="Login" component={LoginScreen} />

      {/* Personal */}
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Commercial */}
      <Stack.Screen name="CommercialTabs" component={CommercialTabs} />

      {/* Facility */}
      <Stack.Screen name="FacilityTabs" component={FacilityTabs} />
    </Stack.Navigator>
  );
}
