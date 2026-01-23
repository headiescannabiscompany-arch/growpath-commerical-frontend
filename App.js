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
  const {
    loading,
    authChecked,
    token,
    user,
    mode,
    selectedFacilityId,
    plan,
    capabilities
  } = useAuth();
  console.log("[RenderGate] snapshot", {
    loading: typeof loading !== "undefined" ? loading : "undef",
    authChecked: typeof authChecked !== "undefined" ? authChecked : "undef",
    token: typeof token !== "undefined" ? !!token : "undef",
    user: typeof user !== "undefined" ? !!user : "undef",
    mode: typeof mode !== "undefined" ? mode : "undef",
    plan: typeof plan !== "undefined" ? plan : "undef",
    capabilities: typeof capabilities !== "undefined" ? capabilities : "undef",
    capabilitiesPresent: !!capabilities,
    capabilitiesKeys: capabilities ? Object.keys(capabilities).slice(0, 25) : null
  });

  if (!authChecked || loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff"
        }}
      >
        <Text style={{ fontSize: 24 }}>Loading App...</Text>
      </View>
    );
  }

  const navKey = `${mode}:${selectedFacilityId || "none"}`;
  return (
    <NavigationContainer ref={navigationRef} key={navKey}>
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
