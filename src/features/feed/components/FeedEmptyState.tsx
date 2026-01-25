// src/features/feed/components/FeedEmptyState.tsx
import React from "react";
import { View, Text } from "react-native";

export function FeedEmptyState({ message = "No feed items found." }) {
  return (
    <View
      style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}
    >
      <Text style={{ color: "#888", fontSize: 16 }}>{message}</Text>
    </View>
  );
}
