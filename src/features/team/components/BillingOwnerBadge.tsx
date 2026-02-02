import React from "react";
import { Text } from "react-native";

export default function BillingOwnerBadge() {
  return (
    <Text
      style={{
        backgroundColor: "#ffd600",
        color: "#222",
        paddingHorizontal: 8,
        borderRadius: 6,
        fontWeight: "bold",
        fontSize: 12,
        marginLeft: 6
      }}
    >
      💳 Billing Owner
    </Text>
  );
}
