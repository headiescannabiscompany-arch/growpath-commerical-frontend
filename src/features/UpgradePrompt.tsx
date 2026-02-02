import React from "react";
import { View, Text, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function UpgradePrompt({ feature }: { feature: string }) {
  const navigation = useNavigation();
  return (
    <View
      style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}
    >
      <Text style={{ fontSize: 20, fontWeight: "bold", marginBottom: 12 }}>
        Upgrade required
      </Text>
      <Text style={{ marginBottom: 24 }}>
        Your current plan does not include{" "}
        <Text style={{ fontWeight: "bold" }}>{feature}</Text>.
      </Text>
      <Button title="View Plans" onPress={() => navigation.navigate("BillingHome")} />
    </View>
  );
}
