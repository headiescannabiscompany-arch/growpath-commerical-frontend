import React from "react";
import { Text } from "react-native";

const COLORS = {
  OWNER: "#ffd600",
  MANAGER: "#64b5f6",
  STAFF: "#a5d6a7",
  VIEWER: "#e0e0e0"
};

type RoleKey = keyof typeof COLORS;

export default function RoleBadge({ role }: { role: RoleKey }) {
  return (
    <Text
      style={{
        backgroundColor: COLORS[role],
        color: "#222",
        paddingHorizontal: 8,
        borderRadius: 6,
        fontWeight: "bold",
        fontSize: 12,
        marginLeft: 6
      }}
    >
      {role}
    </Text>
  );
}
