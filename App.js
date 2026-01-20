import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import {
  NavigationContainer,
  createNavigationContainerRef
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RootNavigator from "./src/navigation/RootNavigator.js";
import { AuthProvider, useAuth } from "./src/context/AuthContext.js";

const navigationRef = createNavigationContainerRef();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5 // 5 minutes
    }
  }
});

if (typeof globalThis !== "undefined") {
  // @ts-ignore
  globalThis.__NAV__ = navigationRef;
}
if (typeof window !== "undefined") {
  // @ts-ignore
  window.__NAV__ = navigationRef;
  try {
    if (window.parent && window.parent !== window) {
      // @ts-ignore
      window.parent.__NAV__ = navigationRef;
    }
    if (window.top && window.top !== window) {
      // @ts-ignore
      window.top.__NAV__ = navigationRef;
    }
  } catch {}
}

function AppContent() {
  const { loading, token, user } = useAuth();
  console.log("[AppContent] loading:", loading, "token:", token, "user:", user);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff"
        }}
      >
        <ActivityIndicator size="large" color="#2ecc71" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>
          Loading GrowPath Commercial...
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  console.log(
    "[App] API_BASE_URL:",
    process.env.EXPO_PUBLIC_API_URL,
    process.env.API_URL,
    process.env.REACT_NATIVE_APP_API_URL,
    process.env.NEXT_PUBLIC_API_URL
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <StatusBar style="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
