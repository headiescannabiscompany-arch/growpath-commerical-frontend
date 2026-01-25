import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";
import SplashScreen from "../screens/SplashScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { loading, authChecked, token } = useAuth();

  // Absolute rule: never render real navigation until auth is definitively known
  if (!authChecked || loading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <Stack.Screen name="App" component={AppNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
