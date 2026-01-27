import React from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import { AuthProvider, useAuth } from "./src/context/AuthContext.js";
import { View, Text, ActivityIndicator } from "react-native";
import "expo-router/entry";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } }
});

function AppContent() {
  const { loading, authChecked } = useAuth();
  if (!authChecked || loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, fontSize: 18 }}>Loading App...</Text>
      </View>
    );
  }
  return <Slot />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <StatusBar style="dark" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
