import React from "react";
import { View, Text, ScrollView } from "react-native";

export default function FeedScreen() {
  return (
    <ScrollView
      contentContainerStyle={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 16 }}>Feed</Text>
      <Text style={{ fontSize: 14, color: "#999" }}>
        Commercial mode feed placeholder.
      </Text>
    </ScrollView>
  );
}
