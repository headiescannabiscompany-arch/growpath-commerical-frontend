import React from "react";
import {
  NavigationContainer,
  createNavigationContainerRef
} from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import RootNavigator from "./src/navigation/RootNavigator";
import { AuthProvider } from "./src/context/AuthContext";
import { EntitlementsProvider } from "./src/context/EntitlementsContext";
// Optional: add later
// import { ErrorBoundary } from "./src/components/ErrorBoundary";
// import { ToastProvider } from "./src/components/ToastProvider";

export const navigationRef = createNavigationContainerRef();

// IMPORTANT: define QueryClient OUTSIDE the component so it never recreates
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});

export default function App() {
  return (
    // <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EntitlementsProvider>
          {/* <ToastProvider> */}
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
          {/* </ToastProvider> */}
        </EntitlementsProvider>
      </AuthProvider>
    </QueryClientProvider>
    // </ErrorBoundary>
  );
}
