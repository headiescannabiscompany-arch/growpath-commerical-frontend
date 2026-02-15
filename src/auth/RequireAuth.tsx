/* eslint-disable react-hooks/exhaustive-deps */
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, user, isHydrating } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  React.useEffect(() => {
    if (!isHydrating) {
      const inAuthGroup = segments[0] === "(auth)";
      if (!token || !user) {
        if (!inAuthGroup) router.replace("/(auth)/login");
        return;
      }
      if (inAuthGroup) router.replace("/(app)/home");
    }
  }, [isHydrating, token, user, segments]);

  if (isHydrating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <>{children}</>;
}
