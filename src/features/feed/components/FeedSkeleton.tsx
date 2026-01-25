// src/features/feed/components/FeedSkeleton.tsx
import React from "react";
import { View, ActivityIndicator } from "react-native";

export function FeedSkeleton() {
  return (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
}
