import React from "react";
import { View, Text } from "react-native";

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "800" }}>GrowPath AI</Text>
      <Text style={{ marginTop: 8, opacity: 0.7 }}>Home</Text>
    </View>
  );
}
