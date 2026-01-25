import React from "react";
import { Text, View } from "react-native";

type Props = {
  reason?: string;
};

export default function NotEntitledScreen({ reason }: Props) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18, fontWeight: "800", marginBottom: 8 }}>
        Not entitled
      </Text>
      <Text style={{ opacity: 0.8 }}>
        {reason ?? "You don’t have access to this section."}
      </Text>
    </View>
  );
}
