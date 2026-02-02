import React from "react";
import { View, Text } from "react-native";

export default function DashboardCard({ title, value, unit }) {
  return (
    <View
      style={{
        padding: 16,
        margin: 8,
        backgroundColor: "#f5f5f5",
        borderRadius: 8,
        alignItems: "center",
        minWidth: 120
      }}
    >
      <Text style={{ fontSize: 16, color: "#888" }}>{title}</Text>
      <Text style={{ fontSize: 28, fontWeight: "bold", color: "#222" }}>
        {value} {unit}
      </Text>
    </View>
  );
}
